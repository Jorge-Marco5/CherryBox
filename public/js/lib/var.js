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

const urlPath = window.location.pathname;

/*
mock
{ "id": "upl-1789688858360-0-dkkv", "file": {}, "name": "Age-of-Mythology-Extended-Edition-unpackgames.com.7z", "size": 1947171482, "status": "error", "loaded": 1947171726, "percent": 100, "controller": {}, "folder": "", "error": "El archivo excede el límite de tamaño (500MB)", "timestamp": 1789688858361 }, { "id": "upl-1789689101656-0-ggls", "file": {}, "name": "22.pdf", "size": 214297, "status": "uploading", "loaded": 0, "percent": 0, "controller": {}, "folder": "", "error": null, "timestamp": 1789689101657 }, { "id": "upl-1789689101656-0-ggls", "file": {}, "name": "22.pdf", "size": 214297, "status": "completed", "loaded": 214297, "percent": 100, "controller": {}, "folder": "", "error": null, "timestamp": 1789689101657 }
*/