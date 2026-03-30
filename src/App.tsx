import { ErrorBoundary } from './components/ErrorBoundary';
import { VideoPlayer } from './components/VideoPlayer';
import { NoStreamPlaceholder } from './components/VideoPlayer/NoStreamPlaceholder';
import { WeatherPanel } from './components/WeatherPanel';
import { SpotInfo } from './components/SpotInfo';
import { TidePanel } from './components/TidePanel';
import { SpotSelector } from './components/SpotSelector';
import { Layout } from './components/Layout';
import { useWeatherData } from './hooks/useWeatherData';
import { useActiveSpot } from './hooks/useActiveSpot';

function App() {
  const { activeSpot, setActiveSpot } = useActiveSpot();
  const { spotData, loading, error, refreshData, averages, tideSource } = useWeatherData(activeSpot);

  return (
    <ErrorBoundary fallbackMessage="Tarifa Forever encountered an error. Please refresh the page.">
      <Layout>
        <div className="container mx-auto px-4 py-4 space-y-4 max-w-5xl">
          <SpotSelector activeSpot={activeSpot} onSelect={setActiveSpot} />

          <ErrorBoundary fallbackMessage="Video stream unavailable.">
            {activeSpot.twitchChannel ? (
              <VideoPlayer
                twitchChannel={activeSpot.twitchChannel}
                spotName={spotData.name}
                spotLocation={spotData.location}
              />
            ) : (
              <NoStreamPlaceholder spotName={spotData.name} spotLocation={spotData.location} />
            )}
          </ErrorBoundary>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <ErrorBoundary fallbackMessage="Weather data unavailable.">
                <WeatherPanel data={spotData.weather} averages={averages} loading={loading} onRefresh={refreshData} />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-3">
              <ErrorBoundary fallbackMessage="Spot information unavailable.">
                <SpotInfo spot={spotData} />
              </ErrorBoundary>
            </div>
          </div>

          <ErrorBoundary fallbackMessage="Tide data unavailable.">
            <TidePanel tides={spotData.tides} source={tideSource} />
          </ErrorBoundary>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
