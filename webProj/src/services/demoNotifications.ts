import notificationService from "./notificationService";

/**
 * Funkcja do testowania systemu powiadomień
 * Wytwarza przykładowe powiadomienia o różnych priorytetach
 */
export function createDemoNotifications() {

  notificationService.createNotification(
    "Utworzono nowy projekt",
    'Projekt "Demo Android App" został właśnie utworzony przez Admina.',
    "high",
    1
  );

  setTimeout(() => {
    notificationService.createNotification(
      "Nowe zadanie w historyjce",
      'Dodano nowe zadanie "Login Screen" do historyjki "User Authentication".',
      "medium",
      1
    );
  }, 1000);

  setTimeout(() => {
    notificationService.createNotification(
      "Usunięto zadanie z historyjki",
      'Zadanie "Old API Endpoint" zostało usunięte z projektu.',
      "medium",
      1
    );
  }, 2000);

  setTimeout(() => {
    notificationService.createNotification(
      "Zadanie zostało oznaczone jako ukończone",
      'Status zadania "Database Setup" został zmieniony na "done".',
      "medium",
      1
    );
  }, 3000);

  setTimeout(() => {
    notificationService.createNotification(
      "Zadanie jest w trakcie realizacji",
      'Status zadania "Frontend Implementation" został zmieniony na "doing".',
      "low",
      1
    );
  }, 4000);

  setTimeout(() => {
    notificationService.createNotification(
      "Krytyczne powiadomienie",
      "Stanowisko administratora wymaga natychmiastowej uwagi!",
      "high",
      1
    );
  }, 5000);
}

export function testNotificationService() {
  console.log("=== Test Serwisu Powiadomień ===");
  console.log("Wszystkie powiadomienia:", notificationService.getNotifications());
  console.log("Powiadomienia użytkownika:", notificationService.getUserNotifications());
  console.log("Nieprzeczytane:", notificationService.getUnreadNotifications());
  console.log("Liczba nieprzeczytanych:", notificationService.getUnreadCount());
}
