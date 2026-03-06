import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Crown,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  HardDrive
} from 'lucide-react'
import { useVideo } from '../../../context/VideoContext'
import VideoThumbnail from '../../../components/ui/VideoThumbnail'
import {
  getMediaUrl,
  getSecureVideoUrl
} from '../../../utils/api'
import api from '../../../utils/api'
import { slugify } from '../../../utils/slugify'

const EMPTY_FORM = {
  title: '',
  description: '',
  videoFile: null,
  categoryId: '',
  modelId: '',
  isVIP: false,
  isActive: true
}

const MIN_FREE_GB = 10;

const formatBytes = (bytes) => {
  if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(1) + ' TB';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
};

const VideoManagement = () => {
  const {
    adminVideos,
    models,
    categories,
    addVideo,
    updateVideo,
    deleteVideo,
    toggleVideoActive,
    fetchAdminVideos,
  } = useVideo()

  useEffect(() => { fetchAdminVideos(); }, [fetchAdminVideos])

  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Disk space state
  const [diskInfo, setDiskInfo] = useState(null)
  const [diskLoading, setDiskLoading] = useState(true)

  const fetchDiskInfo = useCallback(async () => {
    try {
      setDiskLoading(true);
      const data = await api.get('/system/disk');
      setDiskInfo(data);
    } catch (e) {
      console.error('Disk info fetch error:', e);
    } finally {
      setDiskLoading(false);
    }
  }, []);

  useEffect(() => { fetchDiskInfo(); }, [fetchDiskInfo])

  const freeGB = diskInfo ? diskInfo.freeBytes / (1024 ** 3) : Infinity;
  const isLowDisk = freeGB < MIN_FREE_GB;

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setIsSaving(false)
    setUploadProgress(0)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (isSaving) return

    if (!form.title.trim()) {
      flash('error', 'Baslik zorunludur.')
      return
    }

    if (!editId && !form.videoFile) {
      flash('error', 'Video dosyasi zorunludur.')
      return
    }

    if (isLowDisk && form.videoFile) {
      flash('error', `Yetersiz disk alanı! Kalan: ${diskInfo ? formatBytes(diskInfo.freeBytes) : '?'}. En az 10 GB boş alan gerekli.`)
      return
    }

    try {
      setIsSaving(true)
      setUploadProgress(0)

      if (form.videoFile) {
        // New video upload (or replacing video)
        const { uploadVideoInChunks } = await import('../../../utils/api');
        await uploadVideoInChunks({
          file: form.videoFile,
          metadata: {
            title: form.title.trim(),
            description: form.description ? form.description.trim() : '',
            category_id: form.categoryId || null,
            model_id: form.modelId || null,
            is_vip: form.isVIP,
            is_active: form.isActive
          },
          onProgress: setUploadProgress
        });
        flash('success', 'Video eklendi ve islenmeye basladi.');
        fetchAdminVideos();
        fetchDiskInfo(); // refresh disk info after upload
      } else if (editId) {
        // Just updating metadata, no new video file
        const fd = new FormData();
        fd.append('title', form.title.trim());
        if (form.description) fd.append('description', form.description.trim());
        if (form.categoryId) fd.append('categoryId', form.categoryId);
        if (form.modelId) fd.append('modelId', form.modelId);
        fd.append('isVIP', form.isVIP ? 'true' : 'false');
        fd.append('isActive', form.isActive ? 'true' : 'false');
        
        await updateVideo(editId, fd);
        flash('success', 'Video guncellendi.');
      }

      resetForm()
    } catch (err) {
      flash('error', err.message || 'Video kaydedilirken hata olustu.')
      setIsSaving(false)
    }
  }

  const startEdit = video => {
    const categoryId = video.categoryId ?? video.category_id ?? ''
    const modelId = video.modelId ?? video.model_id ?? ''

    setForm({
      title: video.title,
      description: video.description || '',
      videoFile: null,
      categoryId,
      modelId,
      isVIP: !!video.is_vip,
      isActive: !!video.is_active
    })
    setEditId(video.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    if (isSaving) return
    resetForm()
  }

  const allCategories = categories
  const allModels = models

  return (
    <div className='space-y-5'>
      {/* Disk Space Info */}
      <div className='card p-4'>
        <div className='flex items-center gap-2 mb-3'>
          <HardDrive size={16} className='text-primary-400' />
          <h3 className='text-white font-semibold text-sm'>Sunucu Disk Durumu</h3>
        </div>
        {diskLoading ? (
          <p className='text-gray-500 text-xs'>Yükleniyor...</p>
        ) : diskInfo ? (
          <div className='space-y-2'>
            <div className='w-full bg-dark-600 rounded-full h-3 overflow-hidden'>
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  isLowDisk ? 'bg-red-500' : freeGB < 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: diskInfo.usedPct }}
              />
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
              <div className='flex items-center gap-3'>
                <span className='text-gray-400'>Toplam: <span className='text-white font-medium'>{formatBytes(diskInfo.totalBytes)}</span></span>
                <span className='text-gray-400'>Kullanılan: <span className='text-white font-medium'>{formatBytes(diskInfo.usedBytes)}</span></span>
                <span className={`font-medium ${isLowDisk ? 'text-red-400' : freeGB < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  Boş: {formatBytes(diskInfo.freeBytes)}
                </span>
              </div>
              <span className='text-gray-500'>{diskInfo.usedPct} dolu</span>
            </div>
            {isLowDisk && (
              <div className='mt-1 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/40'>
                <p className='text-red-400 text-xs font-semibold'>⚠ Kritik: Disk alanı 10 GB altında! Video yüklemesi engellenmiştir.</p>
              </div>
            )}
          </div>
        ) : (
          <p className='text-gray-500 text-xs'>Disk bilgisi alınamadı.</p>
        )}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          disabled={isLowDisk}
          className='btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <Plus size={15} />
          {isLowDisk ? 'Disk Alanı Yetersiz' : 'Yeni Video Ekle'}
        </button>
      ) : (
        <div className='card p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-white font-semibold'>
              {editId ? 'Videoyu Duzenle' : 'Yeni Video Ekle'}
            </h3>
            <button
              onClick={cancelEdit}
              className='text-gray-500 hover:text-white'
              disabled={isSaving}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='block text-xs text-gray-400 mb-1'>
                  Baslik *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder='Video basligi'
                  className='input-field text-sm'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-400 mb-1'>
                  Aciklama
                </label>
                <input
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder='Aciklama (istege bagli)'
                  className='input-field text-sm'
                />
              </div>
              <div className='sm:col-span-2'>
                <label className='block text-xs text-gray-400 mb-1'>
                  Video Dosyasi (MP4) {editId && '(Degistirmek istemiyorsaniz bos birakin)'}
                </label>
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={e =>
                    setForm({ ...form, videoFile: e.target.files[0] || null })
                  }
                  className='file-input file-input-bordered file-input-sm w-full bg-dark-600 text-white border-dark-500'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-400 mb-1'>
                  Kategori (istege bagli)
                </label>
                <select
                  value={form.categoryId}
                  onChange={e =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className='input-field text-sm'
                >
                  <option value=''>Seciniz</option>
                  {allCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-400 mb-1'>
                  Model (istege bagli)
                </label>
                <select
                  value={form.modelId}
                  onChange={e => setForm({ ...form, modelId: e.target.value })}
                  className='input-field text-sm'
                >
                  <option value=''>Seciniz</option>
                  {allModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='flex flex-wrap gap-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.isVIP}
                  onChange={e => setForm({ ...form, isVIP: e.target.checked })}
                  className='w-4 h-4 accent-yellow-400'
                />
                <span className='text-sm text-gray-300 flex items-center gap-1'>
                  <Crown size={13} className='text-vip-gold' />
                  VIP Icerik
                </span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={e =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className='w-4 h-4 accent-green-400'
                />
                <span className='text-sm text-gray-300'>Aktif</span>
              </label>
            </div>

            {msg.text && (
              <p
                className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}
              >
                {msg.text}
              </p>
            )}

            {isSaving && form.videoFile && (
              <div className="w-full bg-dark-600 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-xs text-gray-400 mt-1 text-center">Yukleniyor... %{uploadProgress}</p>
              </div>
            )}

            <div className='flex gap-2'>
              <button
                type='submit'
                disabled={isSaving}
                className='btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed'
              >
                <Save size={14} />
                {isSaving ? 'Kaydediliyor...' : editId ? 'Guncelle' : 'Ekle'}
              </button>
              <button
                type='button'
                onClick={cancelEdit}
                disabled={isSaving}
                className='btn-ghost text-sm disabled:opacity-60 disabled:cursor-not-allowed'
              >
                Iptal
              </button>
            </div>
          </form>
        </div>
      )}

      {msg.text && !showForm && (
        <p
          className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}
        >
          {msg.text}
        </p>
      )}

      <div className='card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-dark-500 bg-dark-700'>
                <th className='text-left px-4 py-3 text-gray-400 font-medium'>
                  Video
                </th>
                <th className='text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell'>
                  Tur
                </th>
                <th className='text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell'>
                  Izlenme
                </th>
                <th className='text-left px-4 py-3 text-gray-400 font-medium'>
                  Durum
                </th>
                <th className='text-right px-4 py-3 text-gray-400 font-medium'>
                  Islemler
                </th>
              </tr>
            </thead>
            <tbody>
              {adminVideos.length === 0 ? (
                <tr>
                  <td colSpan={5} className='text-center py-10 text-gray-500'>
                    Henuz video yok.
                  </td>
                </tr>
              ) : (
                adminVideos.map(video => {
                  const category = allCategories.find(
                    c => c.id === (video.categoryId ?? video.category_id)
                  )
                  const model = allModels.find(
                    m => m.id === (video.modelId ?? video.model_id)
                  )
                  return (
                    <tr
                      key={video.id}
                      className={`border-b border-dark-600 hover:bg-dark-600/30 transition-colors ${
                        !video.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <a
                            href={`/video/${slugify(video.title)}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='w-16 h-9 rounded bg-dark-600 flex-shrink-0 overflow-hidden block hover:opacity-80 transition-opacity'
                          >
                            {video.url && (
                              <VideoThumbnail
                                thumbnail={getMediaUrl(video.thumbnail_url)}
                                videoSrc={getSecureVideoUrl(video.url)}
                                alt={video.title}
                                className='w-full h-full'
                                loading='lazy'
                              />
                            )}
                          </a>
                          <div className='min-w-0'>
                            <p className='text-white font-medium truncate max-w-[140px]'>
                              {video.title}
                            </p>
                            <p className='text-gray-500 text-xs truncate mt-1'>
                              {model?.name || '-'} · {category?.name || '-'}
                            </p>
                            {video.jobStatus && video.jobStatus !== 'completed' && (
                              <p className='text-yellow-500 text-xs mt-1 flex items-center gap-1 font-semibold'>
                                &bull; {video.jobStatus === 'active' ? `Isleniyor (%${Math.round(video.jobProgress || 0)})` : 'Kuyrukta Bekliyor'}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3 hidden md:table-cell'>
                        {video.is_vip ? (
                          <span className='badge-vip'>
                            <Crown size={10} />
                            VIP
                          </span>
                        ) : (
                          <span className='badge-free'>Free</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-gray-400 hidden lg:table-cell'>
                        {(video.view_count || 0).toLocaleString('tr-TR')}
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          onClick={() => toggleVideoActive(video.id)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full font-medium transition-all ${
                            video.is_active
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-dark-500 text-gray-500'
                          }`}
                        >
                          {video.is_active ? (
                            <ToggleRight size={13} />
                          ) : (
                            <ToggleLeft size={13} />
                          )}
                          {video.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => startEdit(video)}
                            className='p-1.5 rounded-lg bg-dark-500 text-gray-400 hover:text-white transition-all'
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Videoyu sil?')) deleteVideo(video.id)
                            }}
                            className='p-1.5 rounded-lg bg-dark-500 text-red-400 hover:bg-red-900/30 transition-all'
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default VideoManagement
