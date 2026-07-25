/**Helper para almacenar los formatos de archivos soportados para visualizacion en localstorage*/
async function getFormats() {
  const response = await FileService.getFormats();
  localStorage.setItem("audioExts", JSON.stringify(response.data.audioExts));
  localStorage.setItem("codeExts", JSON.stringify(response.data.codeExts));
  localStorage.setItem("imageExts", JSON.stringify(response.data.imageExts));
  localStorage.setItem("pdfExts", JSON.stringify(response.data.pdfExts));
  localStorage.setItem("textExts", JSON.stringify(response.data.textExts));
  localStorage.setItem("videoExts", JSON.stringify(response.data.videoExts));
}

getFormats();
