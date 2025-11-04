import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AthleteSelector from '../components/AthleteSelector'
import AthleteComparator from '../components/AthleteComparator'
import AthleteSpiderChart from '../components/AthleteSpiderChart'
import AthleteResultsChart from '../components/AthleteResultsChart'

const SeguimientoPage = () => {
  const [comparatorAthletes, setComparatorAthletes] = useState([])

  const handleComparatorsChange = useCallback((comparators) => {
    setComparatorAthletes(comparators)
  }, [])

  // Cargar comparadores desde localStorage al montar y cuando cambien
  useEffect(() => {
    const loadComparators = () => {
      try {
        const stored = localStorage.getItem('comparatorAthletes')
        if (stored) {
          const parsed = JSON.parse(stored)
          const comparadoresArray = Array.isArray(parsed) ? parsed : []
          setComparatorAthletes(comparadoresArray)
        }
      } catch (error) {
        console.error('Error al cargar comparadores desde localStorage:', error)
        localStorage.removeItem('comparatorAthletes')
      }
    }

    loadComparators()

    // Escuchar evento personalizado cuando se añade un atleta desde el header
    const handleAthleteAdded = () => {
      loadComparators()
    }

    window.addEventListener('comparatorAthletesChanged', handleAthleteAdded)

    return () => {
      window.removeEventListener('comparatorAthletesChanged', handleAthleteAdded)
    }
  }, [])

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        pb: '100px', // Espacio para el BottomNavigation
      }}
    >
      {/* Contenido principal */}
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: 2,
          py: 2,
          gap: 2,
        }}
      >

        {/* Componente selector de atleta */}
        <Box sx={{ width: '100%' }}>
          <AthleteSelector />
        </Box>

        {/* Componente gráfico de araña */}
        <Box sx={{ width: '100%' }}>
          <AthleteSpiderChart comparatorAthletes={comparatorAthletes} />
        </Box>

        {/* Componente gráfico de resultados */}
        <Box sx={{ width: '100%' }}>
          <AthleteResultsChart comparatorAthletes={comparatorAthletes} />
        </Box>
      </Box>
    </Box>
  )
}

export default SeguimientoPage

