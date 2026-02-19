import PropTypes from 'prop-types'
import { Typography as MuiTypography } from '@mui/material'

const Typography = ({ variant = 'body1', children, ...props }) => {
    // Map our design system variants to MUI variants if needed, or use directly
    // Currently 1:1 mapping with tokens
    return (
        <MuiTypography variant={variant} {...props}>
            {children}
        </MuiTypography>
    )
}

Typography.propTypes = {
    variant: PropTypes.oneOf([
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'body1',
        'body2',
        'caption',
        'button',
        'overline',
        'subtitle1',
        'subtitle2'
    ]),
    children: PropTypes.node,
}

export default Typography
