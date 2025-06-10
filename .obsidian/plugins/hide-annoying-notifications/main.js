const { Plugin } = require('obsidian');

/**
 * Список уведомлений, которые нужно скрывать (точное совпадение)
 * Легко расширяется при необходимости
 */
const HIDDEN_NOTIFICATIONS = [
  "2/2 Remotely Save finished!",
  "1/2 Remotely Save starts running (webdav)"
];

/**
 * Список префиксов уведомлений, которые нужно скрывать
 * Скрывает уведомления, начинающиеся с указанного текста
 */
const HIDDEN_NOTIFICATION_PREFIXES = [
  "New command manual stops because",
  "Manual: Syncing"
];

/**
 * Плагин для скрытия раздражающих уведомлений
 * РЕЖИМ: Скрывает ВСЕ уведомления
 */
module.exports = class HideAnnoyingNotifications extends Plugin {
  async onload() {
    console.log('Hide Annoying Notifications: Активация плагина');
    
    // Инициализируем плагин немедленно
    this.initializePlugin();
  }

  /**
   * Инициализация плагина с множественными стратегиями
   */
  initializePlugin() {
    // Стратегия 1: Немедленная попытка инициализации
    this.tryInitializeNotificationHiding();
    
    // Стратегия 2: После готовности workspace
    this.app.workspace.onLayoutReady(() => {
      this.tryInitializeNotificationHiding();
    });
    
    // Стратегия 3: Отложенная инициализация с повторными попытками
    setTimeout(() => {
      this.initializeWithRetries();
    }, 100);
  }

  /**
   * Инициализация с повторными попытками
   */
  initializeWithRetries() {
    let attempts = 0;
    const maxAttempts = 10;
    const retryInterval = 500;
    
    const tryInit = () => {
      attempts++;
      
      if (this.tryInitializeNotificationHiding()) {
        console.log(`Hide Annoying Notifications: Успешная инициализация с ${attempts} попытки`);
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(tryInit, retryInterval);
      } else {
        console.warn('Hide Annoying Notifications: Не удалось найти контейнер уведомлений после всех попыток');
      }
    };
    
    tryInit();
  }

  /**
   * Попытка инициализации системы скрытия уведомлений
   * @returns {boolean} true если инициализация успешна
   */
  tryInitializeNotificationHiding() {
    // Избегаем повторной инициализации
    if (this.observer) {
      return true;
    }
    
    const container = this.findNotificationContainer();
    if (!container) {
      return false;
    }
    
    this.setupNotificationObserver(container);
    
    // Скрываем существующие уведомления
    this.hideExistingNotifications(container);
    
    return true;
  }

  /**
   * Поиск контейнера уведомлений
   */
  findNotificationContainer() {
    // Множественные селекторы для поиска контейнера
    const selectors = [
      ".notice-container",
      ".notifications",
      ".notification-container"
    ];
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        console.log(`Найден контейнер уведомлений: ${selector}`);
        return container;
      }
    }
    
    return null;
  }

  /**
   * Настройка наблюдателя за уведомлениями
   */
  setupNotificationObserver(container) {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          this.processNotificationNode(node);
        });
      });
    });

    this.observer.observe(container, { 
      childList: true,
      subtree: true
    });
    
    console.log('Hide Annoying Notifications: Наблюдение активировано - все уведомления будут скрыты');
  }

  /**
   * Скрытие уже существующих уведомлений
   */
  hideExistingNotifications(container) {
    const existingNotices = container.querySelectorAll('.notice');
    existingNotices.forEach(notice => {
      const notificationText = notice.textContent?.trim();
      if (this.shouldHideNotification(notificationText)) {
        notice.remove();
        console.log(`Скрыто существующее уведомление: ${notificationText}`);
      }
    });
  }

  /**
   * Обработка узла уведомления
   */
  processNotificationNode(node) {
    if (!(node instanceof HTMLElement) || !node.classList.contains("notice")) {
      return;
    }

    const notificationText = node.textContent?.trim();
    if (this.shouldHideNotification(notificationText)) {
      node.remove();
      console.log(`Скрыто уведомление: ${notificationText}`);
    }
  }

  /**
   * Проверка, нужно ли скрывать уведомление
   * ВНИМАНИЕ: Скрывает ВСЕ уведомления
   */
  shouldHideNotification(text) {
    // Скрываем абсолютно все уведомления
    return true;
  }

  onunload() {
    console.log('Hide Annoying Notifications: деактивирован');
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
};