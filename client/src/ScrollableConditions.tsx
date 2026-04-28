import { useEffect, useRef, useState } from 'react';

export function ScrollableConditions({ items }: { items: string[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function checkScroll() {
      if (!list) return;
      if (list.scrollHeight <= list.clientHeight) {
        setIsAtBottom(true);
        return;
      }
      setIsAtBottom(list.scrollTop + list.clientHeight >= list.scrollHeight - 1);
    }

    checkScroll();
    list.addEventListener('scroll', checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(list);

    return () => {
      list.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="conditions-wrapper">
      <ul ref={listRef} className="conditions-list conditions-list--scrollable">
        {items.map(item => (
          <li key={item} className="conditions-list__item">{item}</li>
        ))}
      </ul>
      {!isAtBottom && <div className="conditions-fade" aria-hidden="true" />}
    </div>
  );
}
