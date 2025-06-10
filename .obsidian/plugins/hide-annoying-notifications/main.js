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
    console.log('Hide Annoying Notifications: Режим полного скрытия активирован');
    
    // Перезапуск плагина для обеспечения корректной инициализации
    await this.restartPluginOnFirstLoad();
    
    this.initializeNotificationHiding();
  }

  /**
   * Принудительный перезапуск плагина при каждом открытии хранилища
   */
  async restartPluginOnFirstLoad() {
    const pluginId = this.manifest.id;
    const currentTime = Date.now();
    const lastRestartKey = `${pluginId}-last-restart`;
    const minRestartInterval = 2000; // Минимальный интервал между перезапусками
    
    // Получаем время последнего перезапуска
    const lastRestart = parseInt(localStorage.getItem(lastRestartKey) || '0');
    
    // Проверяем, прошло ли достаточно времени с последнего перезапуска
    if (currentTime - lastRestart > minRestartInterval) {
      localStorage.setItem(lastRestartKey, currentTime.toString());
      
      console.log(`${pluginId}: Принудительный перезапуск при открытии хранилища`);
      
      // Небольшая задержка для стабильности
      setTimeout(async () => {
        try {
          await this.app.plugins.disablePlugin(pluginId);
          await this.app.plugins.enablePlugin(pluginId);
        } catch (error) {
          console.error(`Ошибка перезапуска ${pluginId}:`, error);
        }
      }, 150);
      
      return true; // Плагин будет перезапущен
    }
    
    console.log(`${pluginId}: Перезапуск пропущен (слишком рано)`);
    return false; // Перезапуск пропущен
  }

  /**
   * Инициализация системы скрытия уведомлений
   */
  initializeNotificationHiding() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          this.processNotificationNode(node);
        });
      });
    });

    // Ожидаем полной загрузки DOM
    this.app.workspace.onLayoutReady(() => {
      this.startObserving();
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

  /**
   * Запуск наблюдения за контейнером уведомлений
   */
  startObserving() {
    const container = document.querySelector(".notice-container");
    if (container) {
      this.observer.observe(container, { childList: true });
      console.log('Наблюдение за уведомлениями запущено - все уведомления будут скрыты');
    }
  }

  onunload() {
    console.log('Hide Annoying Notifications: деактивирован');
    if (this.observer) {
      this.observer.disconnect();
    }
  }
};