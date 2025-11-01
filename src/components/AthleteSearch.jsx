import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { supabase } from '../lib/supabase'

function AthleteSearch({ onResultClick }) {
  const [searchType, setSearchType] = useState('nombre') // 'nombre', 'licencia', 'club'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  const handleSearchTypeChange = (event, newType) => {
    if (newType !== null) {
      setSearchType(newType)
      setResults([])
      setError(null)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Por favor, introduce un término de búsqueda')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      let atletaIds = []

      switch (searchType) {
        case 'nombre': {
          // Buscar por nombre en la tabla atletas
          const { data: nombreData, error: nombreError } = await supabase
            .from('atletas')
            .select('atleta_id, nombre, licencia')
            .ilike('nombre', `%${searchQuery.trim()}%`)
            .limit(100)
          
          if (nombreError) throw nombreError
          
          if (!nombreData || nombreData.length === 0) {
            setError('No se encontraron atletas con ese nombre')
            setLoading(false)
            return
          }
          
          atletaIds = nombreData.map(a => a.atleta_id)
          break
        }

        case 'licencia': {
          // Buscar por licencia en la tabla atletas
          const { data: licenciaData, error: licenciaError } = await supabase
            .from('atletas')
            .select('atleta_id, nombre, licencia')
            .ilike('licencia', `%${searchQuery.trim()}%`)
            .limit(100)
          
          if (licenciaError) throw licenciaError
          
          if (!licenciaData || licenciaData.length === 0) {
            setError('No se encontraron atletas con esa licencia')
            setLoading(false)
            return
          }
          
          atletaIds = licenciaData.map(a => a.atleta_id)
          break
        }

        case 'club': {
          // Primero buscar el club_id por nombre
          const { data: clubsData, error: clubsError } = await supabase
            .from('clubes')
            .select('club_id, nombre')
            .ilike('nombre', `%${searchQuery.trim()}%`)
            .limit(10)
          
          if (clubsError) throw clubsError
          
          if (!clubsData || clubsData.length === 0) {
            setError('No se encontró ningún club con ese nombre')
            setLoading(false)
            return
          }
          
          const clubIds = clubsData.map(c => c.club_id)
          
          // Obtener atletas únicos de esos clubes (a través de resultados)
          const { data: resultadosData, error: resultadosError } = await supabase
            .from('resultados')
            .select('atleta_id')
            .in('club_id', clubIds)
          
          if (resultadosError) throw resultadosError
          
          // Extraer IDs únicos de atletas
          atletaIds = [...new Set(resultadosData?.map(r => r.atleta_id).filter(Boolean) || [])]
          
          if (atletaIds.length === 0) {
            setError('No se encontraron atletas en ese club')
            setLoading(false)
            return
          }
          break
        }

        default:
          throw new Error('Tipo de búsqueda no válido')
      }

      if (atletaIds.length === 0) {
        setError('No se encontraron atletas para tu búsqueda')
        setLoading(false)
        return
      }

      // Obtener información de los atletas
      const { data: atletasData, error: atletasError } = await supabase
        .from('atletas')
        .select('atleta_id, nombre, licencia')
        .in('atleta_id', atletaIds)
      
      if (atletasError) throw atletasError

      if (!atletasData || atletasData.length === 0) {
        setError('No se encontraron atletas')
        setLoading(false)
        return
      }

      // Para cada atleta, obtener su club más reciente (último resultado)
      // Primero obtener el club_id más reciente por atleta
      const { data: resultadosPorAtleta, error: resultadosError } = await supabase
        .from('resultados')
        .select('atleta_id, club_id, fecha')
        .in('atleta_id', atletaIds)
        .order('fecha', { ascending: false, nullsFirst: false })
      
      if (resultadosError) throw resultadosError

      // Crear un mapa con el club_id más reciente por atleta
      const clubPorAtletaMap = new Map()
      if (resultadosPorAtleta) {
        for (const resultado of resultadosPorAtleta) {
          if (resultado.atleta_id && resultado.club_id && !clubPorAtletaMap.has(resultado.atleta_id)) {
            clubPorAtletaMap.set(resultado.atleta_id, resultado.club_id)
          }
        }
      }

      // Obtener IDs únicos de clubes
      const clubIdsUnicos = [...new Set(clubPorAtletaMap.values())]
      
      // Obtener nombres de clubes
      const { data: clubesData, error: clubesError } = clubIdsUnicos.length > 0
        ? await supabase
            .from('clubes')
            .select('club_id, nombre')
            .in('club_id', clubIdsUnicos)
        : { data: null, error: null }
      
      if (clubesError) throw clubesError

      // Crear mapa de clubes
      const clubesMap = new Map(clubesData?.map(c => [c.club_id, c.nombre]) || [])
      
      // Crear resultados únicos (solo nombre, licencia, club)
      const resultadosUnicos = atletasData.map(atleta => {
        const clubId = clubPorAtletaMap.get(atleta.atleta_id)
        const clubNombre = clubId ? (clubesMap.get(clubId) || 'Sin club') : 'Sin club'
        
        return {
          atleta_id: atleta.atleta_id,
          nombre: atleta.nombre,
          licencia: atleta.licencia || 'N/A',
          club: clubNombre
        }
      })

      // Eliminar duplicados por atleta_id (por si acaso)
      const resultadosFinales = Array.from(
        new Map(resultadosUnicos.map(r => [r.atleta_id, r])).values()
      )

      // Ordenar por nombre
      resultadosFinales.sort((a, b) => a.nombre.localeCompare(b.nombre))

      setResults(resultadosFinales)
    } catch (err) {
      console.error('Error en la búsqueda:', err)
      setError(err.message || 'Error al realizar la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Búsqueda de Atletas
          </Typography>

          {/* Selector de tipo de búsqueda */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={searchType}
              exclusive
              onChange={handleSearchTypeChange}
              aria-label="tipo de búsqueda"
              size="small"
            >
              <ToggleButton value="nombre" aria-label="por nombre">
                Nombre
              </ToggleButton>
              <ToggleButton value="licencia" aria-label="por licencia">
                Licencia
              </ToggleButton>
              <ToggleButton value="club" aria-label="por club">
                Club
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Campo de búsqueda */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label={`Buscar por ${searchType === 'nombre' ? 'nombre' : searchType === 'licencia' ? 'licencia' : 'club'}`}
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                searchType === 'nombre' 
                  ? 'Ej: Juan Pérez'
                  : searchType === 'licencia'
                  ? 'Ej: 12345'
                  : 'Ej: FC Barcelona'
              }
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ minWidth: 120 }}
            >
              Buscar
            </Button>
          </Box>

          {/* Mensajes de error */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resultados ({results.length})
            </Typography>

            <List>
              {results.map((item, index) => (
                <Box key={item.atleta_id || index}>
                  <ListItemButton 
                    onClick={() => onResultClick && onResultClick(item)}
                    sx={{
                      alignItems: 'flex-start',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" component="span" fontWeight="bold">
                            {item.nombre}
                          </Typography>
                          {item.licencia && item.licencia !== 'N/A' && (
                            <Chip 
                              label={`Lic: ${item.licencia}`} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                          {item.club && item.club !== 'N/A' && item.club !== 'Sin club' && (
                            <Chip 
                              label={item.club} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      
                    />
                  </ListItemButton>
                  {index < results.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default AthleteSearch

