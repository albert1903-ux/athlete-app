import PropTypes from 'prop-types'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import { MdClose } from 'react-icons/md'
import Typography from './Typography'

const ModalRoot = ({ open, onClose, children, title, maxWidth = 'sm', fullScreenOnMobile = true, ...props }) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const isFullScreen = fullScreenOnMobile && isMobile

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isFullScreen}
            maxWidth={maxWidth}
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: isFullScreen ? 0 : theme.shape.borderRadius,
                    margin: isFullScreen ? 0 : 2,
                },
            }}
            {...props}
        >
            {children}
        </Dialog>
    )
}

ModalRoot.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    title: PropTypes.string,
    maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    fullScreenOnMobile: PropTypes.bool,
}

const ModalHeader = ({ children, onClose, ...props }) => {
    return (
        <DialogTitle
            sx={{
                m: 0,
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
            {...props}
        >
            {typeof children === 'string' ? (
                <Typography variant="h6">{children}</Typography>
            ) : (
                children
            )}
            {onClose ? (
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <MdClose />
                </IconButton>
            ) : null}
        </DialogTitle>
    )
}

ModalHeader.propTypes = {
    children: PropTypes.node.isRequired,
    onClose: PropTypes.func,
}

const ModalBody = ({ children, dividers = false, ...props }) => {
    return (
        <DialogContent dividers={dividers} {...props}>
            {children}
        </DialogContent>
    )
}

ModalBody.propTypes = {
    children: PropTypes.node.isRequired,
    dividers: PropTypes.bool,
}

const ModalFooter = ({ children, ...props }) => {
    return (
        <DialogActions sx={{ p: 2 }} {...props}>
            {children}
        </DialogActions>
    )
}

ModalFooter.propTypes = {
    children: PropTypes.node.isRequired,
}

const Modal = {
    Root: ModalRoot,
    Header: ModalHeader,
    Body: ModalBody,
    Footer: ModalFooter,
}

export default Modal
