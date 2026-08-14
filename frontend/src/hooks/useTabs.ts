import { useState, useCallback } from 'react';

export interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

export const useTabs = (initialTabs: EditorTab[] = []) => {
  const [tabs, setTabs] = useState<EditorTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    initialTabs[0]?.id || null
  );

  const addTab = useCallback((tab: Omit<EditorTab, 'isDirty'>) => {
    setTabs(prevTabs => {
      // If tab already exists, just make it active
      const existingTab = prevTabs.find(t => t.id === tab.id);
      if (existingTab) {
        setActiveTabId(tab.id);
        return prevTabs;
      }
      
      // Otherwise add new tab
      return [...prevTabs, { ...tab, isDirty: false }];
    });
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to another one
      if (activeTabId === tabId && newTabs.length > 0) {
        const currentIndex = prevTabs.findIndex(tab => tab.id === tabId);
        const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        setActiveTabId(newTabs[newActiveIndex]?.id || null);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, content, isDirty: true }
          : tab
      )
    );
  }, []);

  const setTabActive = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

  return {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    closeTab,
    updateTabContent,
    setTabActive,
  };
};

export default useTabs;
