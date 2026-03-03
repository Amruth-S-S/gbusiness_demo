// axiosConfig.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://gbusiness-dev1-35486280762.asia-south1.run.app', // Your base URL here
  timeout: 10000,
});

// Default API key for all requests
const API_KEY = "Mnnshh@&!UyqrtvTTXCTvbjjj>ISecuredFCAhyqbjxeg*&@$!7676191005HbghbbwswswIUbwqvQCG1065";

/**
 * Utility function to make GET requests with consistent configuration
 * @param url - The endpoint URL (without the base URL)
 * @param params - URL parameters to include in the request
 * @param customConfig - Additional axios config options
 * @returns Promise with the response
 */
const get = async <T = any>(
  url: string, 
  params: Record<string, any> = {}, 
  customConfig: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> => {
  // Default headers with API key
  const defaultHeaders = {
    'Accept': 'application/json',
    'X-API-Key': API_KEY,
  };

  // Combine default config with custom config
  const config: AxiosRequestConfig = {
    method: 'GET',
    url,
    params,
    headers: {
      ...defaultHeaders,
      ...(customConfig.headers || {}),
    },
    ...customConfig,
  };

  try {
    return await axiosInstance(config);
  } catch (error) {
    console.error(`GET request to ${url} failed:, error`);
    throw error;
  }
};

export { axiosInstance,get,API_KEY};