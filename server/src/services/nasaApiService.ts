import axios from 'axios';

export interface NASAApiConfig {
  apiKey: string;
  baseUrls: {
    apod: string;
    marsRover: string;
    neows: string;
    exoplanet: string;
    techPort: string;
    imageLibrary: string;
  };
}

export interface APODResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

export interface MarsRoverPhoto {
  id: number;
  sol: number;
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
  };
}

export interface NearEarthObject {
  id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    close_approach_date_full: string;
    epoch_date_close_approach: number;
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
      miles_per_hour: string;
    };
    miss_distance: {
      astronomical: string;
      lunar: string;
      kilometers: string;
      miles: string;
    };
  }>;
}

export class NASAApiService {
  private config: NASAApiConfig;

  constructor(apiKey: string = 'DEMO_KEY') {
    this.config = {
      apiKey,
      baseUrls: {
        apod: 'https://api.nasa.gov/planetary/apod',
        marsRover: 'https://api.nasa.gov/mars-photos/api/v1/rovers',
        neows: 'https://api.nasa.gov/neo/rest/v1',
        exoplanet: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
        techPort: 'https://api.nasa.gov/techport/api',
        imageLibrary: 'https://images-api.nasa.gov'
      }
    };
  }

  /**
   * Get Astronomy Picture of the Day
   */
  async getAPOD(date?: string): Promise<APODResponse> {
    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey
      });
      
      if (date) {
        params.append('date', date);
      }

      const response = await axios.get(`${this.config.baseUrls.apod}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching APOD:', error);
      throw new Error('Failed to fetch Astronomy Picture of the Day');
    }
  }

  /**
   * Get multiple APOD images for a date range
   */
  async getAPODRange(startDate: string, endDate: string): Promise<APODResponse[]> {
    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        start_date: startDate,
        end_date: endDate
      });

      const response = await axios.get(`${this.config.baseUrls.apod}?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Error fetching APOD range:', error);
      throw new Error('Failed to fetch APOD range');
    }
  }

  /**
   * Get Mars Rover photos
   */
  async getMarsRoverPhotos(
    rover: 'curiosity' | 'opportunity' | 'spirit' | 'perseverance' = 'curiosity',
    sol?: number,
    earthDate?: string,
    camera?: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<{ photos: MarsRoverPhoto[] }> {
    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        page: page.toString(),
        per_page: perPage.toString()
      });

      if (sol !== undefined) {
        params.append('sol', sol.toString());
      } else if (earthDate) {
        params.append('earth_date', earthDate);
      } else {
        // Default to latest photos
        params.append('sol', '1000');
      }

      if (camera) {
        params.append('camera', camera);
      }

      const response = await axios.get(
        `${this.config.baseUrls.marsRover}/${rover}/photos?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching Mars rover photos:', error);
      throw new Error('Failed to fetch Mars rover photos');
    }
  }

  /**
   * Get latest Mars Rover photos from multiple rovers
   */
  async getLatestMarsPhotos(): Promise<{ rover: string; photos: MarsRoverPhoto[] }[]> {
    const rovers = ['curiosity', 'perseverance'];
    const results = [];

    for (const rover of rovers) {
      try {
        const photos = await this.getMarsRoverPhotos(rover as any, undefined, undefined, undefined, 1, 10);
        results.push({
          rover,
          photos: photos.photos
        });
      } catch (error) {
        console.error(`Error fetching photos for ${rover}:`, error);
      }
    }

    return results;
  }

  /**
   * Get Near Earth Objects
   */
  async getNearEarthObjects(
    startDate?: string,
    endDate?: string,
    detailed: boolean = false
  ): Promise<{
    element_count: number;
    near_earth_objects: Record<string, NearEarthObject[]>;
  }> {
    try {
      const today = new Date();
      const start = startDate || today.toISOString().split('T')[0];
      const end = endDate || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        start_date: start,
        end_date: end,
        detailed: detailed.toString()
      });

      const response = await axios.get(`${this.config.baseUrls.neows}/feed?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Near Earth Objects:', error);
      throw new Error('Failed to fetch Near Earth Objects');
    }
  }

  /**
   * Get specific asteroid details
   */
  async getAsteroidDetails(asteroidId: string): Promise<NearEarthObject> {
    try {
      const response = await axios.get(
        `${this.config.baseUrls.neows}/neo/${asteroidId}?api_key=${this.config.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching asteroid details:', error);
      throw new Error('Failed to fetch asteroid details');
    }
  }

  /**
   * Search NASA image and video library
   */
  async searchNASAImages(
    query: string,
    mediaType: 'image' | 'video' | 'audio' = 'image',
    yearStart?: string,
    yearEnd?: string
  ): Promise<{
    collection: {
      items: Array<{
        href: string;
        data: Array<{
          title: string;
          description: string;
          date_created: string;
          media_type: string;
          keywords: string[];
          nasa_id: string;
        }>;
        links?: Array<{
          href: string;
          rel: string;
          render?: string;
        }>;
      }>;
      metadata: {
        total_hits: number;
      };
    };
  }> {
    try {
      const params = new URLSearchParams({
        q: query,
        media_type: mediaType
      });

      if (yearStart) params.append('year_start', yearStart);
      if (yearEnd) params.append('year_end', yearEnd);

      const response = await axios.get(`${this.config.baseUrls.imageLibrary}/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching NASA images:', error);
      throw new Error('Failed to search NASA images');
    }
  }

  /**
   * Get exoplanet data from NASA Exoplanet Archive
   */
  async getExoplanetData(
    query: string = 'select pl_name,hostname,sy_dist,pl_rade,pl_bmasse,pl_orbper,pl_eqt,disc_year from ps where pl_rade is not null and pl_eqt is not null',
    format: 'json' | 'csv' | 'tsv' = 'json'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        query,
        format
      });

      const response = await axios.get(`${this.config.baseUrls.exoplanet}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching exoplanet data:', error);
      throw new Error('Failed to fetch exoplanet data');
    }
  }

  /**
   * Get current space missions and technology projects
   */
  async getTechPortProjects(projectId?: string): Promise<any> {
    try {
      const endpoint = projectId 
        ? `${this.config.baseUrls.techPort}/projects/${projectId}`
        : `${this.config.baseUrls.techPort}/projects`;
      
      const response = await axios.get(`${endpoint}?api_key=${this.config.apiKey}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TechPort projects:', error);
      throw new Error('Failed to fetch NASA technology projects');
    }
  }

  /**
   * Get comprehensive space data for AI responses
   */
  async getComprehensiveSpaceData(query: string): Promise<{
    apod?: APODResponse;
    marsPhotos?: MarsRoverPhoto[];
    asteroids?: NearEarthObject[];
    nasaImages?: any;
    exoplanets?: any;
  }> {
    const results: any = {};
    const lowerQuery = query.toLowerCase();

    try {
      // Fetch relevant data based on query
      if (lowerQuery.includes('picture') || lowerQuery.includes('image') || lowerQuery.includes('apod')) {
        results.apod = await this.getAPOD();
      }

      if (lowerQuery.includes('mars') || lowerQuery.includes('rover')) {
        const marsData = await this.getMarsRoverPhotos('curiosity', undefined, undefined, undefined, 1, 5);
        results.marsPhotos = marsData.photos;
      }

      if (lowerQuery.includes('asteroid') || lowerQuery.includes('comet') || lowerQuery.includes('near earth')) {
        const asteroidData = await this.getNearEarthObjects();
        results.asteroids = Object.values(asteroidData.near_earth_objects).flat().slice(0, 5);
      }

      if (lowerQuery.includes('exoplanet') || lowerQuery.includes('planet')) {
        results.exoplanets = await this.getExoplanetData(
          'select top 10 pl_name,hostname,sy_dist,pl_rade,pl_eqt,disc_year from ps where pl_rade is not null order by disc_year desc'
        );
      }

      // Search for related images
      if (lowerQuery.includes('show') || lowerQuery.includes('image') || lowerQuery.includes('picture')) {
        const imageResults = await this.searchNASAImages(query, 'image');
        results.nasaImages = imageResults.collection.items.slice(0, 3);
      }

    } catch (error) {
      console.error('Error in comprehensive data fetch:', error);
    }

    return results;
  }

  /**
   * Health check for NASA APIs
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const checks: { [key: string]: boolean } = {};

    try {
      await this.getAPOD();
      checks.apod = true;
    } catch {
      checks.apod = false;
    }

    try {
      await this.getNearEarthObjects();
      checks.neows = true;
    } catch {
      checks.neows = false;
    }

    try {
      await this.getMarsRoverPhotos('curiosity', 1000);
      checks.marsRover = true;
    } catch {
      checks.marsRover = false;
    }

    return checks;
  }
}

export default NASAApiService;