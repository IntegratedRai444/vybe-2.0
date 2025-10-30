import { api } from './serviceFactory';

// Example API service
export const exampleService = {
  // GET /examples
  getExamples: (params?: { page?: number; limit?: number }) =>
    api.get<{ items: any[]; total: number }>('/examples', { params }),

  // GET /examples/:id
  getExampleById: (id: string) =>
    api.get<any>(`/examples/${id}`),

  // POST /examples
  createExample: (data: any) =>
    api.post<any>('/examples', { data }),

  // PUT /examples/:id
  updateExample: (id: string, data: any) =>
    api.put<any>(`/examples/${id}`, { data }),

  // DELETE /examples/:id
  deleteExample: (id: string) =>
    api.delete<void>(`/examples/${id}`),

  // PATCH /examples/:id
  partialUpdateExample: (id: string, data: Partial<any>) =>
    api.patch<any>(`/examples/${id}`, { data }),
};

// Usage example in a React component:
/*
import { exampleService } from 'services/api/exampleService';
import { useEffect, useState } from 'react';
import { ApiError } from 'services/api/serviceFactory';

const ExampleComponent = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await exampleService.getExamples({ page: 1, limit: 10 });
        setData(response.items);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
*/
