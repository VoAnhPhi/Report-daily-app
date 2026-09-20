import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
  onSearch?: (term: string) => void;
}

export function useDebouncedSearch(
  initialValue: string = '',
  options: UseDebouncedSearchOptions = {},
) {
  const { delay = 500, minLength = 0, onSearch } = options;

  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedTerm, setDebouncedTerm] = useState(initialValue);

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      if (searchTerm.length >= minLength) {
        onSearch?.(searchTerm);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay, minLength, onSearch]);

  // Đã bỏ state `isSearching` cùng effect "reset khi debouncedTerm đổi".
  //
  // Vì sao bỏ hẳn thay vì sửa: giá trị đó bật `true` bên trong bộ đếm debounce
  // rồi bị chính effect kia đưa về `false` ngay ở lượt render kế tiếp, nên nơi
  // gọi gần như không bao giờ đọc được `true` — nó không mô tả được khoảng thời
  // gian đang chờ debounce như tên gọi gợi ý. Cả ba nơi dùng hook này
  // (`components/tasks/main-assignee-sidebar.tsx`, `partner-sidebar.tsx`,
  // `select-partner-modal.tsx`) chỉ lấy `searchTerm`, `debouncedTerm`,
  // `handleSearch`, nên bỏ trường này không đổi hành vi màn nào.

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
  }, []);

  return {
    searchTerm,
    debouncedTerm,
    handleSearch,
    clearSearch,
  };
}
