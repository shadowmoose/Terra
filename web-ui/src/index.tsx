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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
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
                onClick={()=>{notifications.close(tID); window.location.reload()}}
            >
                Reload
            </Button>
        })
    }
});

