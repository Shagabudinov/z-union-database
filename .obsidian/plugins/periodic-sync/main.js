const { Plugin, debounce } = require('obsidian');

module.exports = class PeriodicSyncPlugin extends Plugin {
  async onload() {
    console.log('Periodic Sync Plugin загружен - режим реального времени');

    // Перезапуск плагина для обеспечения корректной инициализации
    await this.restartPluginOnFirstLoad();

    // Конфигурация интервалов
    this.config = {
      pullInterval: 600,    // Pull каждые 3 секунды (приоритет)
      pushDebounceDelay: 1800, // Push с задержкой 5 сек после изменений
      syncTimeout: 10000     // Таймаут для операций синхронизации
    };

    // Флаги состояния
    this.syncState = {
      isPulling: false,
      isPushing: false,
      lastPullTime: 0,
      lastPushTime: 0,
      hasLocalChanges: false
    };

    this.initializeRealtimeSync();
  }

  /**
   * Перезапуск плагина при первой загрузке
   */
  async restartPluginOnFirstLoad() {
    const pluginId = this.manifest.id;
    const restartKey = `${pluginId}-restarted`;
    
    // Проверяем, был ли уже выполнен перезапуск в этой сессии
    if (!sessionStorage.getItem(restartKey)) {
      sessionStorage.setItem(restartKey, 'true');
      
      console.log(`${pluginId}: Выполняется перезапуск для корректной инициализации`);
      
      // Небольшая задержка для стабильности
      setTimeout(async () => {
        try {
          await this.app.plugins.disablePlugin(pluginId);
          await this.app.plugins.enablePlugin(pluginId);
        } catch (error) {
          console.error(`Ошибка перезапуска ${pluginId}:`, error);
        }
      }, 100);
      
      return true; // Плагин будет перезапущен
    }
    
    return false; // Перезапуск уже был выполнен
  }

  initializeRealtimeSync() {
    // 1. Агрессивный Pull для получения удаленных изменений
    this.pullIntervalId = setInterval(() => {
      this.performPull();
    }, this.config.pullInterval);

    // 2. Мониторинг изменений файлов с debounced Push
    this.debouncedPush = debounce(
      () => this.performPush(),
      this.config.pushDebounceDelay,
      true
    );

    // 3. Слушаем события изменения файлов
    this.registerEvent(
      this.app.vault.on('modify', () => {
        this.syncState.hasLocalChanges = true;
        this.debouncedPush();
      })
    );

    this.registerEvent(
      this.app.vault.on('create', () => {
        this.syncState.hasLocalChanges = true;
        this.debouncedPush();
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', () => {
        this.syncState.hasLocalChanges = true;
        this.debouncedPush();
      })
    );

    this.registerEvent(
      this.app.vault.on('rename', () => {
        this.syncState.hasLocalChanges = true;
        this.debouncedPush();
      })
    );

    console.log('Мониторинг файлов активирован');
  }

  async performPull() {
    if (this.syncState.isPulling) {
      return;
    }

    this.syncState.isPulling = true;
    const startTime = Date.now();

    try {
      // Пробуем специализированную команду pull, если доступна
      let success = this.app.commands.executeCommandById('remotely-save:start-sync-download');
      
      if (!success) {
        // Fallback на общую синхронизацию
        success = this.app.commands.executeCommandById('remotely-save:start-sync');
      }

      if (success) {
        this.syncState.lastPullTime = Date.now();
        console.log(`Pull выполнен за ${Date.now() - startTime}ms`);
      } else {
        console.warn('Команды синхронизации недоступны');
      }
    } catch (error) {
      console.error('Ошибка Pull:', error);
    } finally {
      // Сброс флага с учетом таймаута
      setTimeout(() => {
        this.syncState.isPulling = false;
      }, Math.min(this.config.syncTimeout, 3000));
    }
  }

  async performPush() {
    if (this.syncState.isPushing || !this.syncState.hasLocalChanges) {
      return;
    }

    this.syncState.isPushing = true;
    const startTime = Date.now();

    try {
      // Пробуем специализированную команду push, если доступна
      let success = this.app.commands.executeCommandById('remotely-save:start-sync-upload');
      
      if (!success) {
        // Fallback на общую синхронизацию
        success = this.app.commands.executeCommandById('remotely-save:start-sync');
      }

      if (success) {
        this.syncState.lastPushTime = Date.now();
        this.syncState.hasLocalChanges = false;
        console.log(`Push выполнен за ${Date.now() - startTime}ms`);
      } else {
        console.warn('Команды синхронизации недоступны для Push');
      }
    } catch (error) {
      console.error('Ошибка Push:', error);
      // При ошибке не сбрасываем флаг изменений
    } finally {
      setTimeout(() => {
        this.syncState.isPushing = false;
      }, Math.min(this.config.syncTimeout, 5000));
    }
  }

  // Метод для принудительной полной синхронизации
  async forceFullSync() {
    if (this.syncState.isPulling || this.syncState.isPushing) {
      console.log('Синхронизация уже выполняется');
      return;
    }

    console.log('Принудительная полная синхронизация');
    await this.performPull();
    
    // Небольшая задержка перед push
    setTimeout(() => {
      if (this.syncState.hasLocalChanges) {
        this.debouncedPush.cancel(); // Отменяем отложенный push
        this.performPush();
      }
    }, 1000);
  }

  onunload() {
    console.log('Periodic Sync Plugin выгружен');
    
    if (this.pullIntervalId) {
      clearInterval(this.pullIntervalId);
    }
    
    if (this.debouncedPush) {
      this.debouncedPush.cancel();
    }

    // Финальная синхронизация при выгрузке
    if (this.syncState.hasLocalChanges) {
      this.app.commands.executeCommandById('remotely-save:start-sync');
    }
  }
};
