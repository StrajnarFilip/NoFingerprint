/*
    NoFingerprint, assists in obfuscating your browser's fingerprint
    Copyright (C) 2022  Filip Strajnar

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/** Reserved keyword that allows the extension to work on any URL*/
const ALL_URLS = "<all_urls>"

/**
 * Callback function that will be called by onBeforeRequest listener.
 * 
 * @param details 
 */
function BeforeRequestCallback(
    details: browser.webRequest._OnBeforeRequestDetails
): void {
    
}

/**
 * listener before request
 */
browser.webRequest.onBeforeRequest.addListener(
    BeforeRequestCallback,
    { urls: [ALL_URLS] },
    ["blocking"]
);

/**
 * This function will replace css conditional selectors that are used to get fingerprint.
 * It also removes font family related CSS
 * @param requestId ID of request, of which response this function will modify
 */
function ModifyResponseId(requestId: string) {
    const filter = browser.webRequest.filterResponseData(requestId);
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    filter.ondata = event => {
        const decodedBody: string = decoder.decode(event.data, { stream: true });

        const cssMediaRemoved = decodedBody.replaceAll("@media", '');
        const cssDocumentRemoved = cssMediaRemoved.replaceAll("@document", '');
        const cssSupportsRemoved = cssDocumentRemoved.replaceAll("@supports", '');
        const cssImportRemoved = cssSupportsRemoved.replaceAll("@import", '');
        const cssFontFaceRemoved = cssImportRemoved.replaceAll("@font-face", '');
        const cssFontFamilyRemoved = cssFontFaceRemoved.replaceAll("font-family:",'')

        filter.write(encoder.encode(cssFontFamilyRemoved));
        filter.disconnect();
    }
}


/**
 * Function callback that is executed before headers are sent
 * @param details 
 * @returns Either cancels the request or passes it through
 */
function BeforeHeadersCallback(
    details: browser.webRequest._OnBeforeSendHeadersDetails
): browser.webRequest.BlockingResponse { 

    if (details.requestHeaders) {
        const isRequestFont = details.requestHeaders.some(
            (element, elIndex) => {
                return element.name.toLowerCase().includes("sec-fetch-dest") && element.value?.toLowerCase().includes("font")
            }
        )

        const isRequestHtml = details.requestHeaders.some(
            (element, elIndex) => {
                return element.name.toLowerCase().includes("accept") && element.value?.toLowerCase().includes("text/html")
            }
        )

        if (isRequestHtml) {
            ModifyResponseId(details.requestId)
        }

        return {
            cancel: isRequestFont
        }
    }

    return {

    }
}

browser.webRequest.onBeforeSendHeaders.addListener(
    BeforeHeadersCallback,
    { urls: [ALL_URLS] },
    ["blocking", "requestHeaders"]
)