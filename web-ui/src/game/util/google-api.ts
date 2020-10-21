import {observable} from "mobx";
import {db} from '../db/database';
import {exportDB, importDB} from "dexie-export-import";

class GoogleApi {
    private injected = false;
    private apiReady: any = null;
    private apiFailed: any = null;
    public readonly waitForLoad = new Promise((res, fail) => {
        this.apiReady = res;
        this.apiFailed = fail;
    });
    @observable public isSignedIn: boolean = false;

    /**
     * Injects a script object into the base page node, which loads and initiates the Google API.
     * This is automatically called initially before export, in order for this client to work.
     */
    public inject() {
        if (this.injected) return;
        this.injected = true;
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/client.js";

        script.onload = () => {
            gapi.load('client:auth2', () => {
                gapi.client.init({
                    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                    scope: 'https://www.googleapis.com/auth/drive.appdata',
                }).then(() => {
                    // Listen for sign-in state changes.
                    gapi.auth2.getAuthInstance().isSignedIn.listen(res => this.isSignedIn = res);
                    this.isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
                    this.apiReady();
                }, (error) => {
                    console.error(error);
                    this.apiFailed(error);
                });
            });
        };
        document.body.appendChild(script);
    }

    /**
     * Fire a callback when the sign-in status changes.
     * Always fires an initial value, so that it cannot be missed if no update occurs.
     * @param callback
     */
    public onSignInChange(callback: Function) {
        this.waitForLoad.then(() => {
            callback(gapi.auth2.getAuthInstance().isSignedIn.get());
            gapi.auth2.getAuthInstance().isSignedIn.listen(res => callback(res));
        })
    }

    /**
     * Prompts the user to sign in, using a popup Google homepage.
     */
    public async promptSignIn() {
        await this.waitForLoad;
        localStorage['lastDriveUpdate'] = 0;
        if (!this.isSignedIn) {
            return gapi.auth2.getAuthInstance().signIn().then(res => {
                console.log('Login res:', res);
                console.log(this.isSignedIn, gapi.auth2.getAuthInstance().isSignedIn.get())
            })
        }
    }

    /**
     * Disconnects the current user from the API.
     */
    public async signOut() {
        return gapi.auth2.getAuthInstance().signOut();
    }

    /**
     * Uploads the given Blob to the connected Google Drive, if one is available.
     *
     * Either creates a new file if one does not exist already, or replaces the old one.
     * @param data
     * @param mimeType
     */
    private async upload(data: Blob, mimeType: string = 'application/json') {
        if (!this.isSignedIn) throw Error('Attempted to upload when not signed in!');
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        const oauthToken = user.getAuthResponse().access_token;
        const latest = await this.getLatestBackup();
        const latestID = latest?.id || '';
        const body = { parents: ['appDataFolder'], name: "terra-db-backup.json", mimeType };

        if(latest) delete body.parents;  // In a PATCH, this field cannot be updated.

        return fetch(`https://www.googleapis.com/upload/drive/v3/files/${latestID}?uploadType=resumable`, {
            method: latest ? 'PATCH' : 'POST',
            headers: {
                Authorization: `Bearer ${oauthToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }).then(resp => {
            const loc = resp.headers.get('location');
            if (!loc) throw Error('No upload redirect location was given.');
            return fetch(loc, {
                method: latest ? 'PATCH':'PUT',
                body: data
            })
        })
    }

    /**
     * Get a list of all files uploaded to the application's data folder.
     */
    private async listFiles() {
        await this.waitForLoad;
        if (!this.isSignedIn) throw Error('Cannot get files when not signed in!');

        return gapi.client.drive.files.list({
            pageSize: 10,
            fields: "nextPageToken, files(id, name, modifiedTime)",
            spaces: 'appDataFolder'
        }).then(function(response) {
            return response.result.files;
        });
    }

    /**
     * Get the most recent file uploaded to the application's data folder.
     */
    private async getLatestBackup(): Promise<gapi.client.drive.File|null> {
        const files = (await this.listFiles()) || [];

        return files.sort((a, b) => {
            return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
        })[0] || null;
    }

    /**
     * Download the given file as a blob. If no file is provided, defaults to the latest version.
     * @param latest
     * @private
     */
    private async downloadLatestBackup(latest: gapi.client.drive.File|null = null) {
        latest = latest || await this.getLatestBackup();
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        const oauthToken = user.getAuthResponse().access_token;

        if (!latest?.id) {
            throw Error('Cannot locate latest file for downloading.')
        } else {
            return fetch(`https://www.googleapis.com/drive/v3/files/${latest.id}?alt=media`, {
                headers: {
                    Authorization: `Bearer ${oauthToken}`
                }
            }).then(res => {
                return res.blob()
            })
        }
    }

    /**
     * Returns the latest File from GDrive, if an updated version is available. Otherwise, returns null.
     */
    public async getLatestUpgrade() {
        const latest = await this.getLatestBackup();
        const lastUpdate = localStorage['lastDriveUpdate'] || -1;
        const driveUpdateTime = new Date(latest?.modifiedTime || 0).getTime();

        return (latest && (driveUpdateTime > lastUpdate)) ? latest : null;
    }

    /**
     * Restores the local DB from the given backup stored on GDrive.
     */
    public async downloadDB(latest: gapi.client.drive.File) {
        const driveUpdateTime = new Date(latest?.modifiedTime || 0).getTime();

        return this.downloadLatestBackup(latest).then(async res => {
            console.log("Updating DB from Drive...");
            await db.delete();
            await importDB(res);
            console.log("Drive Import complete");
            localStorage['lastDriveUpdate'] = driveUpdateTime;
            // @ts-ignore
            window.location = window.location.href.split('#')[0];
            return res;
        });
    }

    /**
     * Uploads the local database contents to Google Drive.
     */
    public async uploadLocalDB() {
        // @ts-ignore
        const blob = await exportDB(db, {
            prettyJson: true,
            progressCallback: (prog: any) => {
                console.debug('Packing DB:', prog);
            }
        });

        return this.upload(blob, 'application/json').then(async res => {
            const txt = await res.text();
            console.debug('Upload result:', txt);
            localStorage['lastDriveUpdate'] = Date.now();
            return JSON.parse(txt);
        }).catch(err => {
            console.error('Upload error:');
            console.error(err);
            return null;
        });
    }
}

const api = new GoogleApi();
api.inject();


// @ts-ignore
window.google = api;

export default api;
