import 'mobx-react-lite/batchingForReactDom'
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import 'fontsource-roboto';
import notifications from "./ui-components/notifications";
import {Button} from "@material-ui/core";

ReactDOM.render(
  //<React.StrictMode>
    <App />,
  //</React.StrictMode>,
  document.getElementById('root')
);

let needReload = false;
serviceWorker.register({
    onSuccess: (data) => {
        console.log('cache worker register: success.', data);
    },
    onUpdate: (data) => {
        console.warn('cache worker update.', data);
        const tID = notifications.info('An update is available. Please reload all open TERA windows.', {
            preventDuplicate: true,
            persist: true,
            action: <Button
                variant={"outlined"}
                onClick={()=>{notifications.close(tID); needReload = true; data.waiting?.postMessage({ type: "SKIP_WAITING" })}}
            >
                Reload
            </Button>
        })
    }
});

navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.warn('cache worker replaced.')
    if (!needReload) return;
    needReload = false;
    window.location.reload();  // Reload when we detect our service worker has changed.
});
