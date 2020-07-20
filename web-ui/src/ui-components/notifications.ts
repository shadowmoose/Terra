import { useSnackbar, WithSnackbarProps, OptionsObject } from 'notistack'
import React from 'react'

let snackbarRef: WithSnackbarProps;


export const SnackbarUtilsConfigurator: React.FC = () => {
    snackbarRef = useSnackbar();
    return null;
};

export default {
    success(msg: string, options: OptionsObject = {}) {
        this.toast(msg, { ...options, variant: 'success' })
    },
    warning(msg: string, options: OptionsObject = {}) {
        this.toast(msg, { ...options, variant: 'warning' })
    },
    info(msg: string, options: OptionsObject = {}) {
        this.toast(msg, { ...options, variant: 'info' })
    },
    error(msg: string, options: OptionsObject = {}) {
        this.toast(msg, { ...options, variant: 'error' })
    },
    toast(msg: string, options: OptionsObject = {}) {
        snackbarRef.enqueueSnackbar(msg, options)
    }
}
