const audioPlayerExts = ['mp3', 'm4a', 'flac'];

/**
 * Servicio encargado de la reproducción de audio, gestión de listas y sincronización de UI.
 */
class MusicPlayerService {
    constructor() {
        this.audio = new Audio();
        this.playlist = [];
        this.currentIndex = -1;
        this.isPlaying = false;

        // Elementos de la UI
        this.playBtn = null;
        this.pauseBtn = null;
        this.progressBar = null;
        this.volumeBar = null;

        // El ID del intervalo para el progreso
        this.progressInterval = null;

        // Esperar a que el DOM esté listo para inicializar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.playBtn = document.getElementById('playMusic');
        this.pauseBtn = document.getElementById('pauseMusic');
        this.progressBar = document.getElementById('progressBar');
        this.volumeBar = document.getElementById('volumeBar');

        // Configurar volumen inicial y fill
        if (this.volumeBar) {
            this.audio.volume = this.volumeBar.value / 100;
            this.updateSliderFill(this.volumeBar);
        }
        if (this.progressBar) {
            this.updateSliderFill(this.progressBar);
        }

        // Eventos de Audio
        this.audio.addEventListener('timeupdate', () => this.updateUIProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('play', () => this.setPlayingState(true));
        this.audio.addEventListener('pause', () => this.setPlayingState(false));

        // Eventos de controles UI
        this.playBtn?.addEventListener('click', () => this.play());
        this.pauseBtn?.addEventListener('click', () => this.pause());
        this.progressBar?.addEventListener('input', (e) => {
            this.seek(e.target.value);
            this.updateSliderFill(e.target);
        });
        this.volumeBar?.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
            this.updateSliderFill(e.target);
        });

        //eventos de control de cambio de pista con dispositivos inalambricos y alambricos
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    }

    setPlaylist(files) {
        this.playlist = files;
        this.currentIndex = -1;
        this.stop();
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
    }

    async play() {
        if (this.currentIndex === -1 && this.playlist.length > 0) {
            await this.playTrack(0);
            return;
        }
        try {
            await this.audio.play();
        } catch (error) {
            console.error('Error al reproducir audio:', error);
        }
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
        const playMusicEl = document.getElementById('playMusic');
        const pauseMusicEl = document.getElementById('pauseMusic');

        if (playMusicEl && pauseMusicEl) {
            playMusicEl.style.display = isPlaying ? 'none' : 'block';
            pauseMusicEl.style.display = isPlaying ? 'block' : 'none';
        }
    }

    highlightTrack(index) {
        const playlistEl = document.getElementById('playlist');
        if (!playlistEl) return;

        Array.from(playlistEl.children).forEach((el, i) => {
            if (i === index) {
                el.classList.add('active-track');
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                el.classList.remove('active-track');
            }
        });
    }
}

// Singleton del servicio
const MusicPlayer = new MusicPlayerService();

// Funciones auxiliares
function containsOnlyOneMusicFile(files) {
    return files.some(file => file.type === 'file' && audioPlayerExts.includes(file.name.split('.').pop().toLowerCase()));
}

async function getMusicFiles(path) {
    try {
        const response = await FileService.getFiles(path);
        const data = response.data;
        return data.files.filter(file => file.type === 'file' && audioPlayerExts.includes(file.name.split('.').pop().toLowerCase()));
    } catch (error) {
        console.error("Error al obtener archivos de música:", error);
        return [];
    }
}

window.MusicPlayer = MusicPlayer;
window.getMusicFiles = getMusicFiles;
window.containsOnlyOneMusicFile = containsOnlyOneMusicFile;