import {useSnackbar, WithSnackbarProps, OptionsObject, SnackbarKey} from 'notistack'
import React from 'react'

let snackbarRef: WithSnackbarProps;


export const SnackbarUtilsConfigurator: React.FC = () => {
    snackbarRef = useSnackbar();
    return null;
};

export default {
    success(msg: string, options: OptionsObject = {}) {
        return this.toast(msg, { ...options, variant: 'success' })
    },
    warning(msg: string, options: OptionsObject = {}) {
        return this.toast(msg, { ...options, variant: 'warning' })
    },
    info(msg: string, options: OptionsObject = {}) {
        return this.toast(msg, { ...options, variant: 'info' })
    },
    error(msg: string, options: OptionsObject = {}) {
        return this.toast(msg, { ...options, variant: 'error' })
    },
    toast(msg: string, options: OptionsObject = {}) {
        return snackbarRef.enqueueSnackbar(msg, options)
    },
    close(key: SnackbarKey) {
        return snackbarRef.closeSnackbar(key)
    }
}
