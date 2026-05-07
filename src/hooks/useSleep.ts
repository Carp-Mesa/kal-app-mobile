import { useQuery } from '@tanstack/react-query';
import { getTodaySleep } from '../services/sleepService';

export const useTodaySleep = () => {
  return useQuery({
    queryKey: ['todaySleep'],
    queryFn: getTodaySleep,
  });
};
