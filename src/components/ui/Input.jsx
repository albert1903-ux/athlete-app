import PropTypes from 'prop-types'
import { TextField } from '@mui/material'

const Input = ({ label, placeholder, error, helperText, ...props }) => {
    return (
        <TextField
            label={label}
            placeholder={placeholder}
            error={!!error}
            helperText={error || helperText}
            variant="outlined"
            fullWidth
            {...props}
        />
    )
}

Input.propTypes = {
    label: PropTypes.string,
    placeholder: PropTypes.string,
    error: PropTypes.string,
    helperText: PropTypes.string,
}

export default Input
