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
                    let uniqueYears = [...new Set(data.map(d => d.anio))].filter(Boolean)

                    // Ensure Current Year is always included
                    const currentYear = new Date().getFullYear()
                    if (!uniqueYears.includes(currentYear)) {
                        uniqueYears.push(currentYear)
                    }

                    // Sort descending
                    uniqueYears.sort((a, b) => b - a)

                    setYears(uniqueYears)

                    // Set default year logic: Current Year -> Previous Year -> ...
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

            if (code.includes('SUB10')) { ageMin = 8; ageMax = 9; }
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
                const categoriaLabel = categoria.label || categoria.nombre // Need label for logic (e.g. SUB12)

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


                let eligibleAthleteIds = null

                // STRATEGY:
                // If "Histórico", keep using simple query (all time top 50).
                // If a specific Year is selected:
                // 1. Calculate eligible birth years for that category in that year.
                // 2. Fetch IDs of athletes born in those years.
                // 3. Fetch results for those athletes in [Year, Year-1].

                let targetYears = []
                const isHistoric = selectedYear === 'historic'

                if (!isHistoric) {
                    const rYear = Number(selectedYear)
                    // Valid results = Selected Year AND Previous Year (as per requirements)
                    targetYears = [rYear, rYear - 1]

                    const eligibleBirthYears = getEligibleBirthYears(categoriaLabel, selectedYear)

                    if (eligibleBirthYears.length > 0) {
                        // Creating ISO dates for range check on fecha_nac
                        // Actually fecha_nac is date YYYY-MM-DD
                        // Filter by date range: Jan 1st of minYear to Dec 31st of maxYear
                        const minYear = Math.min(...eligibleBirthYears)
                        const maxYear = Math.max(...eligibleBirthYears)

                        const minDate = `${minYear}-01-01`
                        const maxDate = `${maxYear}-12-31`

                        // Fetch eligible athletes
                        // This might be large but usually thousands, feasible for ID collection
                        const { data: eligibleAthletes, error: athleteError } = await supabase
                            .from('atletas')
                            .select('atleta_id')
                            .gte('fecha_nac', minDate)
                            .lte('fecha_nac', maxDate)

                        if (athleteError) throw athleteError

                        if (eligibleAthletes && eligibleAthletes.length > 0) {
                            eligibleAthleteIds = eligibleAthletes.map(a => a.atleta_id)
                        } else {
                            // No eligible athletes found for this category/year
                            setRankingData({ top50: [], stickyList: [] })
                            return
                        }
                    } else {
                        // Could not determine age group, fallback to simple filtering by category_id in results
                        console.warn("Could not determine birth years for category:", categoriaLabel)
                    }
                }


                // 1. Fetch results
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
                // If we have strict birth year filtering, we might RELAX the category_id filter in results
                // because a result from 2025 might be labeled as "SUB10" but now valid for "SUB12" ranking.
                // HOWEVER, results usually store the category at the time of competition.
                // So we should PROBABLY filtering by Athlete Eligibility regardless of historical category label.
                // SO: if eligibleAthleteIds exists, remove .eq('categoria_id', ...) ?
                // Actually, safer to keep it broadly or remove it if we trust the birth filter.
                // Requirement: "sí hay resultados que son validos...".
                // A 2025 result for a 2015-born kid was SUB12 (First year) or SUB10?
                // Born 2015. In 2025 (age 10) -> SUB12.
                // So the category_id overlap is high.
                // But to be safe and truly implement "Best mark of eligible athletes", we should ignore the record's category_id 
                // and rely on the athlete's eligibility + filtering by valid result years.

                if (eligibleAthleteIds) {
                    // Logic: Get results for these athletes
                    // Do NOT filter by categoria_id (as it might differ in prev year)
                    // Filter by valid years
                    query = query.in('atleta_id', eligibleAthleteIds)
                        .in('anio', targetYears)
                } else {
                    // Fallback (Historic or unknown category logic): use standard category filtering
                    query = query.eq('categoria_id', categoriaId)
                    if (!isHistoric) {
                        query = query.eq('anio', selectedYear)
                    }
                }

                if (effectiveGender) {
                    query = query.eq('genero', effectiveGender)
                }

                // Execute Query
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
                    // Start query
                    let athletesQuery = supabase
                        .from('atletas')
                        .select('atleta_id, nombre, fecha_nac, licencia')
                        .in('atleta_id', Array.from(athleteIds))

                    const { data: athletesData } = await athletesQuery

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
                // Since we fetch 2 years, we likely have duplicates. Pick BEST.
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
