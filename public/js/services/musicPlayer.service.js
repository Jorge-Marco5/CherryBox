/*Servicio para la implementacion de reproductor de musica */

const audioPlayerExts = ['mp3', 'm4a', 'flac'];
//funcion interceptora que recibe el array de archivos y carpetas y devuelve true si contiene al menos un archivo de audio
function containsOnlyOneMusicFile(files) {
    for (const file of files) {
        if (file.type === 'file' && audioPlayerExts.includes(file.name.split('.').pop().toLowerCase())) {
            return true;
        }
    }
    return false;
}

//obtenemos la lista de archivos y carpetas y filtramos los archivos de audio para mostrarlos en consola
async function getMusicFiles(path) {
    const response = await FileService.getFiles(path);
    const data = response.data;
    const musicFiles = data.files.filter(file => file.type === 'file' && audioPlayerExts.includes(file.name.split('.').pop().toLowerCase()));
    return musicFiles;
}