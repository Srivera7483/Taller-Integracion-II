import { useState, useEffect, useRef, useCallback } from 'react';

export const useInfiniteScroll = ({
  fetchFunction,
  limit = 15,
  initialPage = 1,
}) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const loadData = useCallback(async (pageNum, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const newItems = await fetchFunction(pageNum, limit);

      if (!newItems || newItems.length === 0) {
        setHasMore(false);
        if (isInitial) {
          setItems([]);
        }
      } else {
        if (newItems.length < limit) {
          setHasMore(false);
        }
        setItems((prev) => (isInitial ? newItems : [...prev, ...newItems]));
        setPage(pageNum);
      }
    } catch (err) {
      setError(err);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [fetchFunction, limit]);

  useEffect(() => {
    loadData(initialPage, true);
  }, [loadData, initialPage]);

  const loadNextPage = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadData(page + 1, false);
    }
  }, [loading, loadingMore, hasMore, loadData, page]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const options = {
      root: containerRef.current,
      rootMargin: '0px 0px 80px 0px',
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target && target.isIntersecting) {
        loadNextPage();
      }
    }, options);

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, loadNextPage, items]);

  const handleContainerScroll = useCallback((e) => {
    const el = e.target;
    if (!el || loading || loadingMore || !hasMore) return;
    const scrollPosition = el.scrollTop + el.clientHeight;
    const scrollThreshold = el.scrollHeight * 0.8;
    if (scrollPosition >= scrollThreshold) {
      loadNextPage();
    }
  }, [loading, loadingMore, hasMore, loadNextPage]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    loadData(initialPage, true);
  }, [initialPage, loadData]);

  const sentinelIndex = items.length > 0 ? Math.max(0, Math.floor(items.length * 0.8) - 1) : -1;

  return {
    items,
    setItems,
    page,
    loading,
    loadingMore,
    hasMore,
    error,
    containerRef,
    sentinelRef,
    sentinelIndex,
    loadNextPage,
    handleContainerScroll,
    reset,
  };
};
