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
    this.currentArtworkUrl = "public/img/vinyl.png";

    this.playBtn = null;
    this.pauseBtn = null;
    this.progressBar = null;
    this.volumeBar = null;

    this.cherryJamActive = false;

    this.progressInterval = null;

    this.miniTitle = document.querySelector(".marqee-miniplayer-title");
    this.miniArtist = document.querySelector(".marqee-miniplayer-artist");
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

  async playTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;

    this.currentIndex = index;
    const track = this.playlist[index];
    const contentUrl = `${API_URL}/file-content?path=${encodeURIComponent(track.path)}`;
    this.audio.src = contentUrl;
    this.audio.load();
    await this.play();
    this.highlightTrack(index);
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

  async getMetadata(trackUrl) {
    if (this.currentArtworkUrl) {
      URL.revokeObjectURL(this.currentArtworkUrl);
      this.currentArtworkUrl = null;
    }
    this.updateMiniplayerUI({ title: "Cargando metadatos...", artist: "..." });
    try {
      const response = await axios.get(trackUrl, {
        responseType: "blob",
        headers: { Range: "bytes=0-10000000" },
      });

      jsmediatags.read(response.data, {
        onSuccess: async (tag) => {
          const metadata = await this.handleMetadata(tag);
          this.updateMediaSession(metadata);
          this.updateMiniplayerUI(metadata);
        },
        onError: (error) => {
          console.warn("jsmediatags error:", error);
          const fallbackMetadata = {
            title: this.playlist[this.currentIndex]?.name.replace(/\.[^/.]+$/, "") || "Desconocido",
            artist: "Desconocido",
            album: "Desconocido",
            artwork: [],
          };
          this.updateMediaSession(fallbackMetadata);
          this.updateMiniplayerUI(fallbackMetadata);
        },
      });
    } catch (error) {
      console.error("Error al obtener el archivo para metadatos:", error);
    }
  }

  async handleMetadata(data) {
    const tags = data.tags;
    const metadata = {};

    let artworkUrl = "";
    if (tags.picture && tags.picture.data) {
      const byteArray = new Uint8Array(tags.picture.data);
      const blob = new Blob([byteArray], { type: tags.picture.format });
      artworkUrl = URL.createObjectURL(blob);
      this.currentArtworkUrl = artworkUrl;
    }

    metadata.title =
      tags.title || this.playlist[this.currentIndex]?.name.replace(/\.[^/.]+$/, "") || "Título Desconocido";
    metadata.artist = tags.artist || "Artista Desconocido";
    metadata.album = tags.album || "Álbum Desconocido";
    metadata.artwork = artworkUrl
      ? [
        {
          src: artworkUrl,
          sizes: "512x512",
          type: tags.picture.format,
        },
      ]
      : [];

    return metadata;
  }

  async updateMediaSession(data) {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: data.title,
      artist: data.artist,
      album: data.album,
      artwork: data.artwork,
    });

    this.updateMediaSessionPlaybackState();
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

  highlightTrack(index) {
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

  updateMiniplayerUI(metadata) {
    if (this.miniTitle) {
      this.miniTitle.textContent = metadata.title || "Título Desconocido";
    }
    if (this.miniArtist) {
      this.miniArtist.textContent = metadata.artist || "Artista Desconocido";
    }
    if (this.miniImg) {
      this.miniImg.src = this.currentArtworkUrl || "public/img/vinyl.png";
    }
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
