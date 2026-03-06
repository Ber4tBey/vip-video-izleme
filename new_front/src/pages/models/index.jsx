import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Play, Search } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import Pagination from '../../components/ui/Pagination';
import SEO from '../../components/SEO';
import { getMediaUrl } from '../../utils/api';
import api from '../../utils/api';

const MODELS_PER_PAGE = 20;
const VIDEOS_PER_PAGE = 20;

const ModelsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { activeVideos } = useVideo();

  // List state
  const [models, setModels] = useState([]);
  const [modelTotal, setModelTotal] = useState(0);
  const [modelTotalPages, setModelTotalPages] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [modelLoading, setModelLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef(null);

  // Detail state
  const [selectedModel, setSelectedModel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [videoPage, setVideoPage] = useState(1);

  // Fetch model list
  const fetchModels = useCallback(async (page, search) => {
    setModelLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: MODELS_PER_PAGE });
      if (search) params.set('search', search);
      const data = await api.get(`/models?${params.toString()}`);
      setModels(data.models || []);
      setModelTotal(data.total || 0);
      setModelTotalPages(data.totalPages || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setModelLoading(false);
    }
  }, []);

  // Fetch single model by slug
  useEffect(() => {
    if (slug) {
      setDetailLoading(true);
      api.get(`/models/${slug}`)
        .then((model) => { setSelectedModel(model); setVideoPage(1); })
        .catch(() => { setSelectedModel(null); navigate('/models', { replace: true }); })
        .finally(() => setDetailLoading(false));
    } else {
      setSelectedModel(null);
      fetchModels(modelPage, searchTerm);
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch list when page changes (only in list mode)
  useEffect(() => {
    if (!slug) fetchModels(modelPage, searchTerm);
  }, [modelPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setModelPage(1);
      fetchModels(1, value);
    }, 400);
  };

  // Videos for selected model
  const modelVideos = selectedModel
    ? activeVideos.filter((v) => v.model_id === selectedModel.id)
    : [];
  const videoTotalPages = Math.ceil(modelVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = modelVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  return (
    <>
      <SEO 
        title={selectedModel ? `${selectedModel.name} İfşa ve Porno Videoları İzle` : "Türk Modeller, İfşa ve Sex Videoları"}
        description={selectedModel ? `${selectedModel.name} ifşa videoları, en sıcak paylaşımlar ve vip sızıntılar.` : "Yerli modellerin en iyi ifşa, porno ve sex videoları."}
        keywords={selectedModel ? `${selectedModel.name}, ${selectedModel.name} ifşa, ${selectedModel.name} porno, model ifşa, vip kanallar` : "türk modeller, model ifşa, onlyfans sızıntıları, sex videoları"}
      />
      <div className="space-y-6">
        <h1 className="section-title">
          <Users size={24} className="text-primary-500" />
        Modeller
      </h1>

      {detailLoading ? (
        <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
      ) : selectedModel ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Link to="/models" className="btn-ghost text-sm">
              ← Geri
            </Link>
            <div className="flex items-center gap-3">
              {selectedModel.image_url && (
                <img
                  src={getMediaUrl(selectedModel.image_url)}
                  alt={selectedModel.name}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-600"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{selectedModel.name}</h2>
                {selectedModel.description && <p className="text-gray-400 text-sm">{selectedModel.description}</p>}
                <p className="text-gray-500 text-xs mt-0.5">{modelVideos.length} video</p>
              </div>
            </div>
          </div>

          {paginatedVideos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Play size={40} className="mx-auto mb-4 opacity-30" />
              <p>Bu modele ait video bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={videoPage}
            totalPages={videoTotalPages}
            onPageChange={(p) => { setVideoPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Model ara..."
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
              <span className="text-xs text-gray-500">
                {modelTotal} model{searchTerm && ' bulundu'}
              </span>
            </div>
          </div>

          {modelLoading ? (
            <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
          ) : models.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-4 opacity-30" />
              <p>{searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz model eklenmemiş.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {models.map((model) => {
                const count = activeVideos.filter((v) => v.model_id === model.id).length;
                return (
                  <Link
                    key={model.id}
                    to={`/models/${model.slug}`}
                    className="card overflow-hidden hover:border-primary-600 hover:-translate-y-1 transition-all duration-300 group text-left block"
                  >
                    <div className="aspect-square bg-dark-600 overflow-hidden">
                      {model.image_url ? (
                        <img
                          src={getMediaUrl(model.image_url)}
                          alt={model.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-700/30 to-primary-900/30">
                          <span className="text-4xl font-black text-primary-400">
                            {model.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate group-hover:text-primary-400 transition-colors">
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{count} video</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={modelPage}
            totalPages={modelTotalPages}
            onPageChange={(p) => { setModelPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </>
      )}
    </div>
    </>
  );
};

export default ModelsPage;
