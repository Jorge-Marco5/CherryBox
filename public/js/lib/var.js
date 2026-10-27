const API_URL = "/api";

// Estado global
let currentPath = "";
let currentRenameItem = null;
let currentPreviewPath = null;
let currentPermissionFileId = null;
let currentFolderData = { id: null, name: "" };
let isLoadingFiles = false;
let activeUploads = [];
let uploadHistory = [];
let currentModalActive = '';

//url actual
const urlPath = window.location.pathname;

//retorna el tipo de dispositivo [movil, tablet, desktop]
const DeviceType = () => {
    const userAgent = navigator.userAgent;
    if (
        userAgent.match(/Android/i) ||
        userAgent.match(/webOS/i) ||
        userAgent.match(/iPhone/i) ||
        userAgent.match(/iPad/i) ||
        userAgent.match(/iPod/i)
    ) {
        return "movil";
    } else if (userAgent.match(/iPad/i) || userAgent.match(/Macintosh/i)) {
        return "tablet";
    } else {
        return "desktop";
    }
}

//formatos de archivos de localStorage
const codeExts = localStorage.getItem("codeExts") ? JSON.parse(localStorage.getItem("codeExts")) : [];
const textExts = localStorage.getItem("textExts") ? JSON.parse(localStorage.getItem("textExts")) : [];
const imageExts = localStorage.getItem("imageExts") ? JSON.parse(localStorage.getItem("imageExts")) : [];
const videoExts = localStorage.getItem("videoExts") ? JSON.parse(localStorage.getItem("videoExts")) : [];
const audioExts = localStorage.getItem("audioExts") ? JSON.parse(localStorage.getItem("audioExts")) : [];
const pdfExts = localStorage.getItem("pdfExts") ? JSON.parse(localStorage.getItem("pdfExts")) : [];
