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
                // Iterative fetch to find all distinct years
                // Since .distinct() is not easily available, we fetch the max year < last_known
                let foundYears = []
                let currentMax = 9999 // Start high

                while (true) {
                    const { data, error } = await supabase
                        .from('resultados')
                        .select('anio')
                        .lt('anio', currentMax)
                        .order('anio', { ascending: false })
                        .limit(1)

                    if (error) throw error

                    if (data && data.length > 0) {
                        const y = data[0].anio
                        if (y) {
                            foundYears.push(y)
                            currentMax = y
                        } else {
                            break // Should not happen if anio is not null
                        }
                    } else {
                        break // No more years found
                    }

                    // Safety break to prevent infinite loops if something is wrong
                    if (foundYears.length > 20) break
                }

                // Ensure Current Year is always included
                const currentYear = new Date().getFullYear()
                if (!foundYears.includes(currentYear)) {
                    foundYears.unshift(currentYear)
                }

                // Sort descending (just in case)
                foundYears.sort((a, b) => b - a)
                // Unique
                foundYears = [...new Set(foundYears)]

                setYears(foundYears)

                // Set default year logic: Current Year -> Previous Year -> ...
                if (foundYears.includes(currentYear)) {
                    setSelectedYear(currentYear)
                } else if (foundYears.length > 0) {
                    setSelectedYear(foundYears[0])
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

        // Helper to calculate eligible birth years based on category and ranking year
        const getEligibleBirthYears = (catCode, rankYear) => {
            const rYear = Number(rankYear)
            if (isNaN(rYear)) return []

            // Normalize category code to uppercase just in case
            const code = catCode ? catCode.toUpperCase().replace(/\s/g, '') : ''

            let ageMin = 0
            let ageMax = 0

            // Standard Spanish/World Athletics age groups (Age turning in the year of competition)
            // SUB10 (Benjamín): 8-9 years
            // SUB12 (Alevín): 10-11 years
            // SUB14 (Infantil): 12-13 years
            // SUB16 (Cadete): 14-15 years
            // SUB18 (Juvenil): 16-17 years
            // SUB20 (Junior): 18-19 years
            // SUB23 (Promesa): 20-22 years
            // SENIOR: 23-34 years (approx, usually open)
            // MASTER: 35+

            if (code.includes('SUB8') || code.includes('PRE')) { ageMin = 6; ageMax = 7; } // Pre-Benjamín
            else if (code.includes('SUB10')) { ageMin = 8; ageMax = 9; }
            else if (code.includes('SUB12')) { ageMin = 10; ageMax = 11; }
            else if (code.includes('SUB14')) { ageMin = 12; ageMax = 13; }
            else if (code.includes('SUB16')) { ageMin = 14; ageMax = 15; }
            else if (code.includes('SUB18')) { ageMin = 16; ageMax = 17; }
            else if (code.includes('SUB20')) { ageMin = 18; ageMax = 19; }
            else if (code.includes('SUB23')) { ageMin = 20; ageMax = 22; }
            else if (code.includes('SENIOR') || code.includes('ABSOLUT')) { ageMin = 23; ageMax = 99; } // Broad range
            else if (code.includes('MASTER') || code.includes('VET')) { ageMin = 35; ageMax = 99; }
            else {
                // Fallback: try to standard logic if unknown
                return []
            }

            // Birth Year = Current Year - Age
            // Example: 2026, SUB12 (10-11). 
            // 2026 - 10 = 2016
            // 2026 - 11 = 2015
            // So Years: 2015, 2016

            const maxBirthYear = rYear - ageMin
            const minBirthYear = rYear - ageMax

            // Generate range
            const years = []
            for (let y = minBirthYear; y <= maxBirthYear; y++) {
                years.push(y)
            }
            return years
        }

        const fetchRanking = async () => {
            setLoading(true)
            setError(null)

            try {
                const pruebaId = prueba.pruebaId || prueba.prueba_id
                const categoriaId = categoria.categoriaId || categoria.categoria_id
                const categoriaLabel = categoria.label || categoria.nombre

                if (!pruebaId || !categoriaId) {
                    throw new Error('Información de prueba o categoría incompleta')
                }

                // Determine effective gender filter
                let effectiveGender = genderFilter;
                if (!effectiveGender && mainAthleteId) {
                    const { data: athleteRes } = await supabase
                        .from('resultados')
                        .select('genero')
                        .eq('atleta_id', mainAthleteId)
                        .limit(1)
                    if (athleteRes && athleteRes.length > 0) effectiveGender = athleteRes[0].genero
                }

                const isHistoric = selectedYear === 'historic'
                let minDate = null
                let maxDate = null
                let targetYears = []

                if (!isHistoric) {
                    const rYear = Number(selectedYear)
                    // Valid results = Selected Year AND Previous Year
                    targetYears = [rYear, rYear - 1]

                    const eligibleBirthYears = getEligibleBirthYears(categoriaLabel, selectedYear)
                    if (eligibleBirthYears.length > 0) {
                        const minYear = Math.min(...eligibleBirthYears)
                        const maxYear = Math.max(...eligibleBirthYears)
                        minDate = `${minYear}-01-01`
                        maxDate = `${maxYear}-12-31`
                    } else {
                        // Fallback: If unknown category, maybe we cannot use birth filter. 
                        console.warn("Could not determine birth years for category:", categoriaLabel)
                    }
                }

                // Main Query: Fetch Results + Joined Athletes + Joined Clubs
                // Use !inner on athletes to enforce the birth date filter server-side
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
                        anio,
                        atletas!inner (
                            atleta_id, nombre, fecha_nac, licencia
                        ),
                        clubes (
                            club_id, nombre
                        )
                    `)
                    .eq('prueba_id', pruebaId)

                // Apply Filters
                if (!isHistoric) {
                    // Filter by Applicant Birth Date (Server-Side)
                    if (minDate && maxDate) {
                        query = query.gte('atletas.fecha_nac', minDate)
                            .lte('atletas.fecha_nac', maxDate)
                    } else {
                        // Fallback to category_id if we couldn't calc birth years
                        query = query.eq('categoria_id', categoriaId)
                    }

                    // Filter by Seasons/Years
                    query = query.in('anio', targetYears)

                    // Filter by Season Start Date
                    const seasonStartYear = Number(selectedYear) - 1
                    const seasonStartDate = `${seasonStartYear}-09-01`
                    query = query.gte('fecha', seasonStartDate)

                } else {
                    // Historic: Just match category ID from the record
                    // (Assuming historical records have correct category_id snapshot)
                    query = query.eq('categoria_id', categoriaId)
                }

                if (effectiveGender) {
                    query = query.eq('genero', effectiveGender)
                }

                // Execute
                // Use a reasonably high limit for safety, though join filters strictly
                query = query.limit(5000)

                const { data: resultsData, error: resultsError } = await query

                if (resultsError) throw resultsError

                if (!resultsData || resultsData.length === 0) {
                    setRankingData({ top50: [], stickyList: [] })
                    return
                }

                // Process Results (Deduplicate best marks)
                const bestMarksMap = new Map()

                const isTimeBased = prueba.isTimeBased ??
                    (prueba.tipo_marca === 'tiempo' || prueba.tipo_marca === 'crono') ??
                    true

                resultsData.forEach(row => {
                    const atletaId = String(row.atleta_id)
                    let valor = Number(row.marca_valor)

                    // Handle null/invalid explicitly
                    let isValid = true
                    if (row.marca_valor === null || row.marca_valor === undefined || isNaN(valor)) {
                        isValid = false
                        valor = isTimeBased ? Infinity : -Infinity
                    }

                    // Enriched Row directly from joined data
                    const enrichedRow = {
                        ...row,
                        numericValue: valor,
                        atletas: row.atletas || { nombre: 'Desconocido' }, // from join
                        clubes: row.clubes || { nombre: '-' }      // from join
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

                // Calculate Age
                allAthletes.forEach(item => {
                    if (item.fecha && item.atletas?.fecha_nac) {
                        const dateMark = new Date(item.fecha)
                        const dateBirth = new Date(item.atletas.fecha_nac)
                        if (!isNaN(dateMark) && !isNaN(dateBirth)) {
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

                // Rank
                allAthletes.forEach((item, index) => {
                    item.rank = index + 1
                })

                // Split Top 50 vs Sticky
                const top50 = allAthletes.slice(0, 50)
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
                                {item.atletas?.fecha_nac ? new Date(item.atletas.fecha_nac).toLocaleDateString() : '-'}
                            </Typography>
                        </Box>
                    }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="body2" fontWeight="bold">
                            {item.marca_texto || item.marca_valor} {item.unidad}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'right' }}>
                            {new Date(item.fecha).toLocaleDateString()}
                            {item.age && ` • ${item.age} años`}
                        </Typography>
                    </Box>
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
