import PropTypes from 'prop-types'
import { Button as MuiButton, CircularProgress } from '@mui/material'

const Button = ({ variant = 'primary', size = 'md', isLoading = false, children, ...props }) => {
    const variantMap = {
        primary: 'contained',
        secondary: 'outlined',
        ghost: 'text',
    }

    const sizeMap = {
        sm: 'small',
        md: 'medium',
        lg: 'large',
    }

    return (
        <MuiButton
            variant={variantMap[variant]}
            size={sizeMap[size]}
            disabled={isLoading || props.disabled}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : props.startIcon}
            {...props}
        >
            {children}
        </MuiButton>
    )
}

Button.propTypes = {
    variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    isLoading: PropTypes.bool,
    children: PropTypes.node.isRequired,
    disabled: PropTypes.bool,
    startIcon: PropTypes.node,
}

export default Button
