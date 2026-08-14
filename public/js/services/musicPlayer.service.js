const audioPlayerExts = localStorage.getItem("audioExts") ? JSON.parse(localStorage.getItem("audioExts")) : [];

/**
 * Servicio encargado de la reproducción de audio, gestión de listas y sincronización de UI.
 */

class MusicPlayerService {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.currentArtworkUrl = "public/img/back.png";

    this.playBtn = null;
    this.pauseBtn = null;
    this.progressBar = null;
    this.volumeBar = null;

    this.cherryJamActive = false;

    this.progressInterval = null;

    this.miniTitle = document.querySelector(".miniplayer-title");
    this.miniArtist = document.querySelector(".miniplayer-artist");
    this.miniImg = document.querySelector(".miniplayer-artwork img");
    this.player = document.getElementById('miniplayer');

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.playBtn = document.getElementById("playMusic");
    this.pauseBtn = document.getElementById("pauseMusic");
    this.progressBar = document.getElementById("progressBar");
    this.volumeBar = document.getElementById("volumeBar");

    // Configurar volumen inicial y fill
    let vol = localStorage.getItem("volume") || 70;
    if (this.volumeBar) {
      this.volumeBar.value = vol;
      this.audio.volume = vol / 100;
      this.updateSliderFill(this.volumeBar);
    }

    if (this.progressBar) {
      this.updateSliderFill(this.progressBar);
    }

    // Eventos de Audio
    this.audio.addEventListener("timeupdate", () => this.updateUIProgress());
    this.audio.addEventListener("ended", () => this.next());
    this.audio.addEventListener("play", () => this.setPlayingState(true));
    this.audio.addEventListener("pause", () => this.setPlayingState(false));

    // Eventos de controles UI
    this.playBtn?.addEventListener("click", () => this.play());
    this.pauseBtn?.addEventListener("click", () => this.pause());

    // Controles del miniplayer
    const miniPlayBtn = document.getElementById("miniplayerPlay");
    const miniPauseBtn = document.getElementById("miniplayerPause");
    const miniplayerShow = document.getElementById("miniplayerShow");

    miniPlayBtn?.addEventListener("click", () => this.play());
    miniPauseBtn?.addEventListener("click", () => this.pause());
    miniplayerShow?.addEventListener("click", () => this.miniplayerHandler());

    this.progressBar?.addEventListener("input", (e) => {
      this.seek(e.target.value);
      this.updateSliderFill(e.target);
    });
    this.volumeBar?.addEventListener("input", (e) => {
      this.setVolume(e.target.value);
      localStorage.setItem("volume", e.target.value);
      this.updateSliderFill(e.target);
    });

    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => this.play());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("stop", () => this.stop());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime) {
          this.audio.currentTime = details.seekTime;
        }
      });
    }
  }

  setPlaylist(files) {
    this.playlist = files;
  }

  async playTrack(index, path) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const contentUrl = `${API_URL}/file-content?path=${encodeURIComponent(path)}`;
    this.audio.src = contentUrl;
    this.audio.load();
    this.play();
    await this.highlightTrack(index);
    await this.getMetadata(contentUrl);
  }

  async play() {
    if (this.currentIndex === -1 && this.playlist.length > 0) {
      await this.playTrack(0);
      return;
    }
    try {
      await this.audio.play();
    } catch (error) {
      console.error("Error al reproducir audio:", error);
    }
  }

  pictureToDataBase64(picture) {
    if (!picture || !picture.data || picture.data.length === 0) return null;
    try {
      const byteArray = new Uint8Array(picture.data);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < byteArray.length; i += chunkSize) {
        const subArray = byteArray.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, subArray);
      }
      const base64 = btoa(binary);
      let mimeType = picture.format || "image/jpeg";
      if (!mimeType.includes("/")) {
        mimeType = mimeType.toLowerCase().includes("png") ? "image/png" : "image/jpeg";
      }
      return `data:${mimeType};base64,${base64}`;
    } catch (e) {
      console.warn("Error al convertir carátula a Base64:", e);
      return null;
    }
  }

  async getMetadata(trackUrl) {
    if (this.currentArtworkUrl && this.currentArtworkUrl.startsWith("blob:")) {
      URL.revokeObjectURL(this.currentArtworkUrl);
      this.currentArtworkUrl = null;
    }
    this.updateMiniplayerUI({ title: "Cargando metadatos...", artist: "..." });

    const readTags = (target) => {
      return new Promise((resolve, reject) => {
        jsmediatags.read(target, {
          onSuccess: (tag) => resolve(tag),
          onError: (error) => reject(error),
        });
      });
    };

    const fullUrl = trackUrl.startsWith("http://") || trackUrl.startsWith("https://") ? trackUrl : window.location.origin + (trackUrl.startsWith("/") ? "" : "/") + trackUrl;

    try {
      let tagResult = null;

      try {
        tagResult = await readTags(fullUrl);
      } catch (urlError) {
        console.warn("jsmediatags lectura directa por URL falló, intentando respaldo con Blob:", urlError);
      }

      if (!tagResult || !tagResult.tags || Object.keys(tagResult.tags).length === 0) {
        const response = await axios.get(trackUrl, { responseType: "blob" });
        tagResult = await readTags(response.data);
      }

      return await this.handleMetadata(tagResult);
    } catch (error) {
      console.warn("Error al obtener metadatos del archivo:", error);
      return await this.handleMetadata(null);
    }
  }

  async updateCaratuleBackground(artworkSrc) {
    const targetSrc = artworkSrc || "public/img/back.png";
    const imgFront = document.getElementById("playerImage");
    const imgBack = document.getElementById("playerImageBack");

    if (!imgFront) return;

    if (!imgBack) {
      if (imgFront.src === targetSrc) return;
      imgFront.classList.remove("active");
      setTimeout(() => {
        imgFront.src = targetSrc;
        imgFront.classList.add("active");
      }, 300);
      return;
    }

    const currentActive = imgFront.classList.contains("active") ? imgFront : imgBack;
    const currentInactive = currentActive === imgFront ? imgBack : imgFront;

    if (currentActive.src === targetSrc) return;

    const tempImg = new Image();
    tempImg.onload = () => {
      currentInactive.src = targetSrc;
      currentInactive.classList.add("active");
      currentActive.classList.remove("active");
    };
    tempImg.onerror = () => {
      currentInactive.src = "public/img/back.png";
      currentInactive.classList.add("active");
      currentActive.classList.remove("active");
    };
    tempImg.src = targetSrc;
  }

  async handleMetadata(data) {
    const tags = data?.tags || {};
    const metadata = {};
    let artworkUrl = "";
    let artworkBase64 = "";

    if (tags.picture && tags.picture.data && tags.picture.data.length > 0) {
      try {
        let mimeType = tags.picture.format || "image/jpeg";
        if (!mimeType.includes("/")) {
          mimeType = mimeType.toLowerCase().includes("png") ? "image/png" : "image/jpeg";
        }

        const byteArray = new Uint8Array(tags.picture.data);
        const blob = new Blob([byteArray], { type: mimeType });
        artworkUrl = URL.createObjectURL(blob);
        artworkBase64 = this.pictureToDataBase64(tags.picture) || "";
      } catch (e) {
        console.warn("Error al procesar carátula:", e);
      }
    }

    this.currentArtworkUrl = artworkUrl || "public/img/back.png";

    const currentTrack = this.playlist[this.currentIndex];
    const fallbackTitle = currentTrack?.name ? currentTrack.name.replace(/\.[^/.]+$/, "") : "Título Desconocido";

    metadata.title = tags.title || fallbackTitle;
    metadata.artist = tags.artist || "Artista Desconocido";
    metadata.album = tags.album || "Álbum Desconocido";
    metadata.artwork = artworkBase64
      ? [
        {
          src: artworkBase64,
          sizes: "512x512",
          type: tags.picture?.format && tags.picture.format.includes("/") ? tags.picture.format : "image/jpeg",
        },
      ]
      : [];
    metadata.artworkUrl = artworkBase64;

    await this.updateMediaSession(metadata);
    await this.updateCaratuleBackground(artworkBase64);
    await this.updateMiniplayerUI(metadata);

    return metadata;
  }

  async updateMediaSession(data) {
    if (!("mediaSession" in navigator)) return;
    //si MediaImage src excede el tamaño maximo de url permitido
    if (data.artwork[0].src.length > 128 * 1024) {
      data.artwork[0].src = this.currentArtworkUrl;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: data.title,
      artist: data.artist,
      album: data.album,
      artwork: data.artwork,
    });

    this.updateMediaSessionPlaybackState();
    this.currentArtworkUrl = "public/img/back.png";
  }

  updateMediaSessionPlaybackState() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = this.isPlaying ? "playing" : "paused";
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.currentIndex = -1;
  }

  next() {
    if (this.playlist.length === 0) return;
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.playlist.length) {
      nextIndex = 0;
    }
    this.playTrack(nextIndex);
  }

  prev() {
    if (this.playlist.length === 0) return;
    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.playlist.length - 1;
    }
    this.playTrack(prevIndex);
  }

  setVolume(value) {
    const vol = value / 100;
    this.audio.volume = vol;
  }

  seek(value) {
    if (!this.audio.duration) return;
    const time = (value / 100) * this.audio.duration;
    this.audio.currentTime = time;
  }

  updateUIProgress() {
    if (!this.progressBar || !this.audio.duration) return;
    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressBar.value = progress;
    this.updateSliderFill(this.progressBar);
  }

  updateSliderFill(el) {
    const val = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.background = `linear-gradient(to right, #FF146C ${val}%, rgba(238, 238, 238, 0.15) ${val}%)`;
  }

  setPlayingState(isPlaying) {
    this.isPlaying = isPlaying;
    const playMusicEl = document.getElementById("playMusic");
    const pauseMusicEl = document.getElementById("pauseMusic");

    if (playMusicEl && pauseMusicEl) {
      playMusicEl.style.display = isPlaying ? "none" : "block";
      pauseMusicEl.style.display = isPlaying ? "block" : "none";
    }

    // Sincronizar botones del miniplayer
    const miniPlayEl = document.getElementById("miniplayerPlay");
    const miniPauseEl = document.getElementById("miniplayerPause");
    if (miniPlayEl && miniPauseEl) {
      miniPlayEl.style.display = isPlaying ? "none" : "block";
      miniPauseEl.style.display = isPlaying ? "block" : "none";
    }

    this.updateMediaSessionPlaybackState();
  }

  async highlightTrack(index) {
    const playlistEl = document.getElementById("playlist");
    if (!playlistEl) return;

    Array.from(playlistEl.children).forEach((el, i) => {
      if (i === index) {
        el.classList.add("active-track");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        el.classList.remove("active-track");
      }
    });
  }

  miniplayerHandler() {
    if (!this.isPlaying) {
      this.player.classList.remove("show", "hide");
      this.destroyMusicPlayer();
      return;
    }

    if (this.player.classList.contains("show")) {
      this.player.classList.remove("show");
      this.player.classList.add("hide");
    } else {
      this.player.classList.remove("hide");
      this.player.classList.add("show");
    }
  }

  async updateMiniplayerUI(metadata) {
    if (this.miniTitle) {
      this.miniTitle.textContent = metadata.title || "Título Desconocido";
    }
    if (this.miniArtist) {
      this.miniArtist.textContent = metadata.artist || "Artista Desconocido";
    }
    if (this.miniImg) {
      this.miniImg.src = metadata.artworkUrl || "public/img/back.png";
    }
  }

  //destructor
  destroyMusicPlayer() {
    if (this.currentArtworkUrl && this.currentArtworkUrl.startsWith("blob:")) {
      URL.revokeObjectURL(this.currentArtworkUrl);
    }
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.currentArtworkUrl = "public/img/back.png";

    this.playBtn = null;
    this.pauseBtn = null;
    this.progressBar = null;
    this.volumeBar = null;

    this.cherryJamActive = false;

    this.progressInterval = null;
  }

}

// Singleton del servicio
const MusicPlayer = new MusicPlayerService();

// Funciones auxiliares
function containsOnlyOneMusicFile(files) {
  return files.some(
    (file) => file.type === "file" && audioPlayerExts.includes("." + file.name.split(".").pop().toLowerCase()),
  );
}

async function getMusicFiles(path) {
  try {
    const response = await FileService.getFiles(path);
    const data = response.data;
    return data.files.filter(
      (file) => file.type === "file" && audioPlayerExts.includes("." + file.name.split(".").pop().toLowerCase()),
    );
  } catch (error) {
    console.error("Error al obtener archivos de música:", error);
    return [];
  }
}

window.MusicPlayer = MusicPlayer;
window.getMusicFiles = getMusicFiles;
window.containsOnlyOneMusicFile = containsOnlyOneMusicFile;
