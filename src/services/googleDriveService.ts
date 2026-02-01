
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOP = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

export class GoogleDriveService {
    private static tokenClient: any;
    private static gapiInited = false;
    private static gisInited = false;
    private static currentClientId: string | null = null;
    private static currentApiKey: string | null = null;

    static async init(clientId: string, apiKey: string): Promise<void> {
        // If credentials changed, we need to re-init
        if (this.gapiInited && this.gisInited && this.currentClientId === clientId && this.currentApiKey === apiKey) return;

        this.currentClientId = clientId;
        this.currentApiKey = apiKey;
        this.gapiInited = false;
        this.gisInited = false;

        return new Promise((resolve) => {
            const checkInit = () => {
                if (this.gapiInited && this.gisInited) {
                    resolve();
                }
            };

            const gapiScriptId = 'google-api-js';
            const gisScriptId = 'google-gis-js';

            if (!document.getElementById(gapiScriptId)) {
                const gapiScript = document.createElement('script');
                gapiScript.id = gapiScriptId;
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.onload = () => {
                    (window as any).gapi.load('client:picker', async () => {
                        await (window as any).gapi.client.init({
                            apiKey: apiKey,
                            discoveryDocs: DISCOVERY_DOCS,
                        });
                        this.gapiInited = true;
                        checkInit();
                    });
                };
                document.body.appendChild(gapiScript);
            } else {
                // If script exists, we still need to call gapi.client.init with new key if gapi is loaded
                if ((window as any).gapi?.client) {
                    (window as any).gapi.client.init({
                        apiKey: apiKey,
                        discoveryDocs: DISCOVERY_DOCS,
                    }).then(() => {
                        this.gapiInited = true;
                        checkInit();
                    });
                }
            }

            if (!document.getElementById(gisScriptId)) {
                const gisScript = document.createElement('script');
                gisScript.id = gisScriptId;
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.onload = () => {
                    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        scope: SCOP,
                        callback: '', // defined at request time
                    });
                    this.gisInited = true;
                    checkInit();
                };
                document.body.appendChild(gisScript);
            } else {
                // Re-init token client with new clientId if google.accounts exists
                if ((window as any).google?.accounts?.oauth2) {
                    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        scope: SCOP,
                        callback: '',
                    });
                    this.gisInited = true;
                    checkInit();
                }
            }
        });
    }

    static async openPicker(clientId: string, apiKey: string): Promise<File[]> {
        if (!clientId || !apiKey) {
            throw new Error('Google Drive credentials are missing. Please set them in settings.');
        }

        await this.init(clientId, apiKey);

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (resp: any) => {
                if (resp.error !== undefined) {
                    reject(resp);
                    return;
                }
                this.createPicker(resp.access_token, clientId, apiKey, resolve, reject);
            };

            if ((window as any).gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    private static createPicker(accessToken: string, clientId: string, apiKey: string, resolve: (files: File[]) => void, reject: (err: any) => void) {
        const google = (window as any).google;

        const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
        view.setMimeTypes('application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg');

        const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setDeveloperKey(apiKey)
            .setAppId(clientId)
            .setOAuthToken(accessToken)
            .addView(view)
            .addView(new google.picker.DocsUploadView())
            .setCallback(async (data: any) => {
                if (data.action === google.picker.Action.PICKED) {
                    try {
                        const files = await Promise.all(
                            data.docs.map((doc: any) => GoogleDriveService.downloadFile(doc.id, doc.mimeType, doc.name, accessToken))
                        );
                        resolve(files);
                    } catch (e) {
                        reject(e);
                    }
                } else if (data.action === google.picker.Action.CANCEL) {
                    resolve([]);
                }
            })
            .build();

        picker.setVisible(true);
    }

    private static async downloadFile(fileId: string, mimeType: string, fileName: string, accessToken: string): Promise<File> {
        let url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        let exportMimeType = '';
        let finalFileName = fileName;

        // Handle Google Docs & Sheets
        if (mimeType === 'application/vnd.google-apps.document') {
            url += `/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
            exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            finalFileName += '.docx';
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            url += `/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
            exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            finalFileName += '.xlsx';
        } else {
            url += '?alt=media';
        }

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            // Try fallback for Google Docs if docx export fails? Or just throw.
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const blob = await response.blob();
        const finalType = exportMimeType || mimeType;

        return new File([blob], finalFileName, { type: finalType });
    }
}
