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
  onload() {
    console.log('Hide Annoying Notifications: Режим полного скрытия активирован');
    this.initializeNotificationHiding();
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