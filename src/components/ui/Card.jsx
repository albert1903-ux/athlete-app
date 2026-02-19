import PropTypes from 'prop-types'
import { Box } from '@mui/material'
import { tokens } from '../../theme/tokens'

const Card = ({ children, sx = {}, ...props }) => {
    return (
        <Box
            sx={{
                backgroundColor: tokens.colors.background.paper,
                borderRadius: tokens.borderRadius.xl,
                boxShadow: tokens.shadows.card,
                overflow: 'hidden',
                ...sx
            }}
            {...props}
        >
            {children}
        </Box>
    )
}

Card.propTypes = {
    children: PropTypes.node,
    sx: PropTypes.object,
}

export default Card
