import {observable} from "mobx";

class GoogleApi {
    private injected = false;
    apiReady: any = null;
    apiFailed: any = null;
    public readonly waitForLoad = new Promise((res, fail) => {
        this.apiReady = res;
        this.apiFailed = fail;
    });
    @observable isSignedIn: boolean = false;

    public inject() {
        if (this.injected) return;
        this.injected = true;
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/client.js";

        script.onload = () => {
            gapi.load('client:auth2', () => {
                gapi.client.setApiKey('AIzaSyB26RnWl198V2MiY1fNRZMwf_jjBYRup_s');
                gapi.client.init({
                    clientId: '385486352215-sr43km8b4n19ggs65abooqfm6471sv0l.apps.googleusercontent.com',
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

    public async promptSignIn() {
        await this.waitForLoad;
        if (!this.isSignedIn) {
            return gapi.auth2.getAuthInstance().signIn().then(res => {
                console.log('Login res:', res);
                console.log(this.isSignedIn, gapi.auth2.getAuthInstance().isSignedIn.get())
            })
        }
    }

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
    public async upload(data: Blob, mimeType: string = 'application/json') {
        if (!this.isSignedIn) throw Error('Attempted to upload when not signed in!');
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        const oauthToken = user.getAuthResponse().access_token;
        const latest = await this.getLatestBackup();
        const latestID = latest?.id || '';
        const body = { parents: ['appDataFolder'], name: "terra-db-backup.json", mimeType };

        if(latest) delete body.parents;

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

    public async listFiles() {
        await this.waitForLoad;
        if (!this.isSignedIn) throw Error('Cannot get files when not signed in!');

        return gapi.client.drive.files.list({
            pageSize: 10,
            fields: "nextPageToken, files(id, name, modifiedTime, webContentLink)",
            spaces: 'appDataFolder'
        }).then(function(response) {
            return response.result.files;
        });
    }

    public async getLatestBackup(): Promise<gapi.client.drive.File|null> {
        const files = (await this.listFiles()) || [];

        return files.sort((a, b) => {
            return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
        })[0] || null;
    }

    public async downloadLatestBackup() {
        const latest = await this.getLatestBackup();
        const fileId: string|void = latest?.id;

        if (!fileId) {
            return null;
        } else {
            // TODO: Might be a better idea to download the webContentLink, assuming I can get streaming to work.
            return gapi.client.drive.files.get({ fileId, alt: 'media' }).then(res => {
                return res.body;
            })
        }
    }
}

const api = new GoogleApi();
api.inject();

export default api;
