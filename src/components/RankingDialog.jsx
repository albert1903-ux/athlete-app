import { useState, useEffect, useMemo } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Avatar,
    Divider,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton
} from '@mui/material'
import { supabase } from '../lib/supabase'
import { IoClose } from 'react-icons/io5'
import { PiRanking } from 'react-icons/pi'
import { TbSwords } from 'react-icons/tb'
import { getColorForAthlete } from '../utils/athleteColors'

function RankingDialog({
    open,
    onClose,
    prueba,
    categoria,
    mainAthleteId,
    comparatorAthletes = [],
    genderFilter = null,
    onAthleteSelect, // New prop callback
    onAthleteCompare // New prop to add as comparator
}) {
    const [loading, setLoading] = useState(false)
    const [rankingData, setRankingData] = useState([])
    const [error, setError] = useState(null)
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('historic')

    // Determine IDs of "sticky" athletes (main + comparators)
    const stickyAthleteIds = useMemo(() => {
        const ids = new Set()
        if (mainAthleteId) ids.add(String(mainAthleteId))
        if (comparatorAthletes) {
            comparatorAthletes.forEach(a => {
                if (a.atleta_id) ids.add(String(a.atleta_id))
                else if (a.atletaId) ids.add(String(a.atletaId))
            })
        }
        return ids
    }, [mainAthleteId, comparatorAthletes])

    // Fetch available years
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const { data, error } = await supabase
                    .from('resultados')
                    .select('anio')
                    // Using a hack to get unique values since .distinct() might not work as expected in all clients
                    // But typically .select('anio') returns all rows.
                    // Better to use rpc or fetch all and unique in client if list is small.
                    // For now, let's fetch distinct years using a specialized query or just all distinct anios from results
                    // Actually, let's just use a simple query and unique in JS for robustness
                    .order('anio', { ascending: false })

                if (data) {
                    const uniqueYears = [...new Set(data.map(d => d.anio))].filter(Boolean)
                    setYears(uniqueYears)

                    // Set default year logic: Current Year -> Previous Year -> ...
                    const currentYear = new Date().getFullYear()
                    if (uniqueYears.includes(currentYear)) {
                        setSelectedYear(currentYear)
                    } else if (uniqueYears.length > 0) {
                        setSelectedYear(uniqueYears[0])
                    }
                }
            } catch (err) {
                console.error("Error fetching years:", err)
            }
        }
        fetchYears()
    }, [])

    useEffect(() => {
        if (!open || !prueba || !categoria) {
            setRankingData([])
            return
        }

        const fetchRanking = async () => {
            setLoading(true)
            setError(null)

            try {
                const pruebaId = prueba.pruebaId || prueba.prueba_id
                const categoriaId = categoria.categoriaId || categoria.categoria_id

                if (!pruebaId || !categoriaId) {
                    throw new Error('Información de prueba o categoría incompleta')
                }

                // Determine effective gender filter
                let effectiveGender = genderFilter;

                // If no gender provided from prop, try to fetch it for the main athlete
                if (!effectiveGender && mainAthleteId) {
                    const { data: athleteRes } = await supabase
                        .from('resultados')
                        .select('genero')
                        .eq('atleta_id', mainAthleteId)
                        .limit(1)

                    if (athleteRes && athleteRes.length > 0 && athleteRes[0].genero) {
                        effectiveGender = athleteRes[0].genero
                    }
                }

                // 1. Fetch all results (no joins)
                let query = supabase
                    .from('resultados')
                    .select(`
            atleta_id,
            marca_valor,
            marca_texto,
            unidad,
            fecha,
            club_id,
            genero,
            anio
          `)
                    .eq('prueba_id', pruebaId)
                    .eq('categoria_id', categoriaId)

                if (effectiveGender) {
                    query = query.eq('genero', effectiveGender)
                }

                if (selectedYear !== 'historic') {
                    query = query.eq('anio', selectedYear)
                }


                const { data: resultsData, error: resultsError } = await query

                if (resultsError) throw resultsError

                if (!resultsData || resultsData.length === 0) {
                    setRankingData({ top50: [], stickyList: [] })
                    return
                }

                // 2. Extract IDs for fetching related data
                const athleteIds = new Set()
                const clubIds = new Set()
                resultsData.forEach(r => {
                    if (r.atleta_id) athleteIds.add(r.atleta_id)
                    if (r.club_id) clubIds.add(r.club_id)
                })

                // 3. Fetch Athletes and Clubs
                let athletesMap = new Map()
                let clubsMap = new Map()

                if (athleteIds.size > 0) {
                    const { data: athletesData } = await supabase
                        .from('atletas')
                        .select('atleta_id, nombre, fecha_nac, licencia')
                        .in('atleta_id', Array.from(athleteIds))

                    if (athletesData) {
                        athletesData.forEach(a => athletesMap.set(String(a.atleta_id), a))
                    }
                }

                if (clubIds.size > 0) {
                    const { data: clubsData } = await supabase
                        .from('clubes')
                        .select('club_id, nombre')
                        .in('club_id', Array.from(clubIds))

                    if (clubsData) {
                        clubsData.forEach(c => clubsMap.set(String(c.club_id), c))
                    }
                }

                // 4. Group and Join
                const bestMarksMap = new Map()
                const isTimeBased = prueba.isTimeBased ?? true

                resultsData.forEach(row => {
                    const atletaId = String(row.atleta_id)
                    let valor = Number(row.marca_valor)

                    // Handle null/invalid explicitly
                    let isValid = true
                    // Treat null, undefined, or NaN as invalid
                    if (row.marca_valor === null || row.marca_valor === undefined || isNaN(valor)) {
                        isValid = false
                        // Assign sentinel for sorting: worst possible value
                        valor = isTimeBased ? Infinity : -Infinity
                    }

                    // Manually join data
                    const enrichedRow = {
                        ...row,
                        numericValue: valor, // Store parsed value for sorting
                        atletas: athletesMap.get(atletaId) || { nombre: 'Desconocido' },
                        clubes: clubsMap.get(String(row.club_id)) || { nombre: '-' }
                    }

                    if (!bestMarksMap.has(atletaId)) {
                        bestMarksMap.set(atletaId, enrichedRow)
                    } else {
                        const currentBest = bestMarksMap.get(atletaId)
                        const currentVal = currentBest.numericValue

                        let isNewBest = false
                        if (isTimeBased) {
                            if (valor < currentVal) isNewBest = true
                        } else {
                            if (valor > currentVal) isNewBest = true
                        }

                        if (isNewBest) {
                            bestMarksMap.set(atletaId, enrichedRow)
                        }
                    }
                })

                const allAthletes = Array.from(bestMarksMap.values())

                // Calculate Age if possible
                allAthletes.forEach(item => {
                    if (item.fecha && item.atletas?.fecha_nac) {
                        const dateMark = new Date(item.fecha)
                        const dateBirth = new Date(item.atletas.fecha_nac)
                        if (!isNaN(dateMark) && !isNaN(dateBirth)) {
                            // Calculate difference in years
                            const diffTime = Math.abs(dateMark - dateBirth);
                            const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
                            item.age = diffYears.toFixed(1)
                        }
                    }
                })

                // Sort
                allAthletes.sort((a, b) => {
                    const valA = a.numericValue
                    const valB = b.numericValue
                    return isTimeBased ? valA - valB : valB - valA
                })

                // Add rank
                allAthletes.forEach((item, index) => {
                    item.rank = index + 1
                })

                // Split Top 50 vs Others
                const top50 = allAthletes.slice(0, 50)

                // Find sticky athletes not in top 50
                const stickyList = []
                stickyAthleteIds.forEach(id => {
                    const found = allAthletes.find(a => String(a.atleta_id) === id)
                    if (found && found.rank > 50) {
                        stickyList.push(found)
                    }
                })

                setRankingData({ top50, stickyList })

            } catch (err) {
                console.error("Error fetching ranking:", err)
                setError("Error cargando el ranking")
            } finally {
                setLoading(false)
            }
        }

        fetchRanking()
    }, [open, prueba, categoria, stickyAthleteIds, genderFilter, selectedYear])

    const renderRow = (item, isSticky = false) => {
        const isMain = String(item.atleta_id) === String(mainAthleteId)
        const isComparator = stickyAthleteIds.has(String(item.atleta_id)) && !isMain

        // Determine background color
        let bgColor = 'transparent'
        if (isMain) bgColor = 'rgba(25, 118, 210, 0.08)' // Light Blue
        else if (isComparator) bgColor = 'rgba(156, 39, 176, 0.08)' // Light Purple
        if (isSticky) bgColor = 'rgba(0, 0, 0, 0.04)' // Grey for sticky context if not already colored? 
        // Actually keep main/comparator colors even in sticky

        const color = isMain ? getColorForAthlete(item.atleta_id, true) : (isComparator ? getColorForAthlete(item.atleta_id) : 'inherit')

        return (
            <ListItem
                key={item.atleta_id}
                sx={{
                    bgcolor: bgColor,
                    borderBottom: '1px solid #f0f0f0',
                    py: 0.5
                }}
            >
                <Box sx={{ minWidth: 30, mr: 1, display: 'flex', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {item.rank}
                    </Typography>
                </Box>
                <ListItemText
                    primary={
                        <Typography
                            variant="body2"
                            fontWeight={isMain || isComparator ? "bold" : "normal"}
                            color="primary.main"
                            sx={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={() => {
                                if (onAthleteSelect && item.atletas) {
                                    // Construct full athlete object for compatibility with AthleteSelector
                                    const fullAthlete = {
                                        ...item.atletas,
                                        fecha_nacimiento: item.atletas.fecha_nac,
                                        club: item.clubes?.nombre || 'Sin club'
                                    }
                                    onAthleteSelect(fullAthlete)
                                }
                            }}
                        >
                            {item.atletas?.nombre || 'Desconocido'}
                        </Typography>
                    }
                    secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" color="text.secondary">
                                {item.clubes?.nombre || '-'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {new Date(item.fecha).toLocaleDateString()}
                                {item.age && ` • ${item.age} años`}
                            </Typography>
                        </Box>
                    }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                        {item.marca_texto || item.marca_valor} {item.unidad}
                    </Typography>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (onAthleteCompare && item.atletas) {
                                // Construct full athlete object
                                const fullAthlete = {
                                    ...item.atletas,
                                    fecha_nacimiento: item.atletas.fecha_nac,
                                    club: item.clubes?.nombre || 'Sin club'
                                }
                                onAthleteCompare(fullAthlete)
                            }
                        }}
                        title="Comparar (VS)"
                        sx={{ ml: 0.5, p: 0.5, transition: 'background-color 0.2s' }}
                    >
                        <TbSwords size={18} />
                    </IconButton>
                </Box>
            </ListItem>
        )
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PiRanking size={24} />
                        Ranking Top 50
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                        {prueba?.nombre} • {categoria?.label}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            displayEmpty
                            variant="outlined"
                            sx={{ height: 32, fontSize: '0.875rem' }}
                        >
                            {years.map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                            <MenuItem value="historic">Histórico</MenuItem>
                        </Select>
                    </FormControl>
                    <Button onClick={onClose} sx={{ minWidth: 0, p: 1, borderRadius: '50%' }}>
                        <IoClose size={24} />
                    </Button>
                </Box>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ p: 0, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : (
                    <>
                        <List dense sx={{ overflow: 'auto', flex: 1, p: 0 }}>
                            {rankingData.top50?.map(item => renderRow(item))}
                            {rankingData.top50?.length === 0 && (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No hay resultados registrados</Typography>
                                </Box>
                            )}
                        </List>

                        {rankingData.stickyList?.length > 0 && (
                            <Paper
                                elevation={3}
                                sx={{
                                    position: 'sticky',
                                    bottom: 0,
                                    zIndex: 2,
                                    borderTop: '2px solid #e0e0e0'
                                }}
                            >
                                <List dense sx={{ p: 0 }}>
                                    {rankingData.stickyList.map(item => renderRow(item, true))}
                                </List>
                            </Paper>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default RankingDialog
