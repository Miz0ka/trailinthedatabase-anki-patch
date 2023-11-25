// ==UserScript==
// @name         trailinthedatabase-anki
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Patch anki card to add sound from trailinthedatabase
// @author       Ossan
// @match        *://trailsinthedatabase.com/*
// @icon         https://trailsinthedatabase.com/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/*
  This userscript requires anki-connect plugin to allow the user to interact with his flashcard.

  References:
  - https://foosoft.net/projects/anki-connect
*/

// ------------  PARAMS ----------
var ankiConnectURL = "http://127.0.0.1:8765";
var ankiNoteAudioFieldName = "SentAudio";
var ankiNoteEnglishFieldName = "SentEng";
var ankiTagName = "Sora-No-Kiseki";
// -------------------------------

(function() {
    const rootNode = document.getElementsByClassName("simple__loading__bar")[0];
    const config = { attributes: true, childList: false, subtree: false };
    const observer = new MutationObserver((mutationList, observer) => {
      for (const mutation of mutationList) {
          if(mutation.attributeName == 'class' && mutation.target.classList.contains('simple__loading__bar--done')){
              updateTable();
          }
      }
    });
    observer.observe(rootNode, config);
    console.log("TamperMonkey script: trailinthedatabase-anki installed");
})();

function updateTable(){
    var tableList = document.getElementsByClassName("table");
    for (let table of tableList) {
        var audioList = table.getElementsByTagName("audio");
        var styles = `
        color: rgb(21, 136, 62);
        background: none;
        font-weight: 700;
        border: 0px;
        border-radius: 0px;`
        for (let audio of audioList) {
            var button = document.createElement("button");
            button.innerHTML = "+";
            button.style = styles;
            button.title = "Create anki note";
            button.onclick = function() { updateLastAnkiNote(audio.currentSrc, extractEnglishSentence(audio)); };
            audio.insertAdjacentElement("afterend", button)
        }
    }
    console.log("TamperMonkey script: update table");
}

function extractEnglishSentence(audioBalise){
    var englishSentence = audioBalise.nextSibling.nextSibling.innerHTML;
    englishSentence = englishSentence.replace(/<br>/g," ");
    englishSentence = englishSentence.replace(/[^\x20-\x7E]/g, '')
    return englishSentence
}

function updateLastAnkiNote(audioURL, officialEnglishTranslation){
    let lastCreatedNotesRequest = {
        "action": "findNotes",
        "version": 6,
        "params": {
            "query": "added:1"
        }
    };

    GM_xmlhttpRequest({
      method: "POST",
      url: ankiConnectURL,
      data: JSON.stringify(lastCreatedNotesRequest),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      onload: function(response) {
            var noteList = JSON.parse(response.responseText);
            if(noteList.result.length == 0){
                alert("No new note detected")
                return;
            }
            let noteId=noteList.result.pop();

            guiBrowserUnFocus();
            updateNoteTag(noteId);
            updateNoteField(noteId, audioURL, officialEnglishTranslation);
            guiBrowserFocusUpdatedNote(noteId);
        },
      onerror: function(response){
         alert("A problem occured. Possible causes : Anki is not running or the extension anki-connect or your port 8765 is not available. Check in your webbrowser that this address do not 404 : http://127.0.0.1:8765/");
      },
    });
}

function updateNoteTag(noteId){
    let addNoteTagRequest = {
        "action": "addTags",
        "version": 6,
        "params": {
            "notes": [noteId],
            "tags": ankiTagName
        }
    }
    GM_xmlhttpRequest({
        method: "POST",
        url: ankiConnectURL,
        data: JSON.stringify(addNoteTagRequest),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
            console.log(`${noteId} have been tagged [${ankiTagName}]`);
          },
        onerror: function(response){
           alert("A problem occured with the tag request.");
        },
      });
}

function updateNoteField(noteId, audioURL, officialEnglishTranslation){
    let fileName = audioURL.slice(audioURL.indexOf('talk/')).replace(/[^A-Za-z0-9]/g, "_")
    let updateNote = {
        "action": "updateNoteFields",
        "version": 6,
        "params": {
            "note": {
                "id": noteId,
                "fields": {
                  [ankiNoteEnglishFieldName]: officialEnglishTranslation,
                },
            	"audio": [{
                    "url": audioURL,
                    "filename": fileName,
                    "fields": [
                        ankiNoteAudioFieldName
                    ]
                }]
            }
        }
    }

    GM_xmlhttpRequest({
        method: "POST",
        url: ankiConnectURL,
        data: JSON.stringify(updateNote),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
            console.log(`${noteId} have been update with '${audioURL}' and '${officialEnglishTranslation}'`);
          },
        onerror: function(response){
           alert("A problem occured with the tag request.");
        },
      });
}

function guiBrowserUnFocus(){
    let guiBrowserControl = {
        "action": "guiBrowse",
        "version": 5,
        "params": {
            "query": "nid:1"
        }
    }

    GM_xmlhttpRequest({
        method: "POST",
        url: ankiConnectURL,
        data: JSON.stringify(guiBrowserControl),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
          },
        onerror: function(response){
           alert("A problem occured with the unfocus request.");
        },
      });
}

function guiBrowserFocusUpdatedNote(noteId){
    let guiBrowserControl = {
        "action": "guiBrowse",
        "version": 5,
        "params": {
            "query": "nid:"+noteId
        }
    }

    GM_xmlhttpRequest({
        method: "POST",
        url: ankiConnectURL,
        data: JSON.stringify(guiBrowserControl),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
          },
        onerror: function(response){
           alert("A problem occured with the Gui Browser.");
        },
      });
}
