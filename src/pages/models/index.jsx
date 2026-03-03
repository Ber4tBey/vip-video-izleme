import { useState } from 'react';
import { Users, Play } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import VideoPlayer from '../../components/ui/VideoPlayer';
import Pagination from '../../components/ui/Pagination';
import SEO from '../../components/SEO';
import { getMediaUrl } from '../../utils/api';

const MODELS_PER_PAGE = 20;
const VIDEOS_PER_PAGE = 20;

const ModelsPage = () => {
  const { activeModels, activeVideos } = useVideo();
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [modelPage, setModelPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);

  const modelTotalPages = Math.ceil(activeModels.length / MODELS_PER_PAGE);
  const paginatedModels = activeModels.slice(
    (modelPage - 1) * MODELS_PER_PAGE,
    modelPage * MODELS_PER_PAGE
  );

  const modelVideos = selectedModel
    ? activeVideos.filter((v) => v.model_id === selectedModel.id)
    : [];
  const videoTotalPages = Math.ceil(modelVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = modelVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  const handleSelectModel = (m) => {
    setSelectedModel(m);
    setVideoPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      {selectedModel ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelectedModel(null); setVideoPage(1); }}
              className="btn-ghost text-sm"
            >
              ← Geri
            </button>
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
                {selectedModel.bio && <p className="text-gray-400 text-sm">{selectedModel.bio}</p>}
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
                <VideoCard key={v.id} video={v} onClick={setSelectedVideo} />
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
          {activeModels.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-4 opacity-30" />
              <p>Henüz model eklenmemiş.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedModels.map((model) => {
                const count = activeVideos.filter((v) => v.model_id === model.id).length;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className="card overflow-hidden hover:border-primary-600 hover:-translate-y-1 transition-all duration-300 group text-left"
                  >
                    {/* Model resmi */}
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
                    {/* İsim */}
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate group-hover:text-primary-400 transition-colors">
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{count} video</p>
                    </div>
                  </button>
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

      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
    </>
  );
};

export default ModelsPage;
