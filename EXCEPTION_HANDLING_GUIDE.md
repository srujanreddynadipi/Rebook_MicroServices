# Exception Handling: Complete Beginner Guide with Project Examples

## Table of Contents
1. What is an Exception?
2. Try-Catch Block
3. Finally Block
4. Throw
5. Throws
6. Checked vs Unchecked Exceptions
7. Try-with-Resources (Java 7+)
8. Multi-Catch Block (Java 7+)
9. Custom Exceptions
10. Exception Propagation
11. Chained Exceptions
12. Spring Boot Exception Handling
13. Very Important Interview Questions
14. Practical Exercises

---

## 1. What is an Exception?

### Definition
An **exception** is an event that disrupts the normal flow of a program. Instead of crashing, Java allows you to catch and handle these errors gracefully.

### Real-Life Analogy
Imagine you're withdrawing money from an ATM:
- **Normal flow:** Withdraw money successfully ✅
- **Exception:** Insufficient balance ❌
- **Handling:** Show error message and ask to retry

### Types of Errors

```
ERROR TYPES
│
├── Compile-time Errors (Syntax errors) - Program won't run
│   Example: Missing semicolon, wrong variable name
│
├── Runtime Errors (Exceptions) - Program crashes during execution
│   Example: Division by zero, null pointer
│
└── Logic Errors - Program runs but gives wrong result
    Example: Wrong calculation formula
```

---

## 2. Try-Catch Block

### What is Try-Catch?
**Try-Catch** is a mechanism to catch exceptions and prevent your program from crashing.

- **try**: Contains code that might throw an exception
- **catch**: Handles the exception if it occurs

### Simple Example (Beginner Level)

```java
// WITHOUT Try-Catch (Program crashes)
int[] numbers = {10, 20, 30};
System.out.println(numbers[5]);  // INDEX OUT OF BOUNDS - CRASH!

// WITH Try-Catch (Program handles the error gracefully)
int[] numbers = {10, 20, 30};
try {
    System.out.println(numbers[5]);  // This throws an exception
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("Error: Array index out of bounds!");
    System.out.println("Please enter a valid index between 0-2");
}
System.out.println("Program continues...");  // This still runs!
```

### More Examples

```java
// Example 1: Division by zero
try {
    int result = 10 / 0;  // ArithmeticException
} catch (ArithmeticException e) {
    System.out.println("Error: Cannot divide by zero!");
}

// Example 2: Null pointer
try {
    String name = null;
    System.out.println(name.length());  // NullPointerException
} catch (NullPointerException e) {
    System.out.println("Error: String is null!");
}

// Example 3: Number format
try {
    int num = Integer.parseInt("ABC");  // NumberFormatException
} catch (NumberFormatException e) {
    System.out.println("Error: String is not a valid number!");
}
```

### Catching Multiple Exception Types (Basic)

```java
try {
    int[] arr = {1, 2, 3};
    int num = Integer.parseInt("hello");
    System.out.println(arr[10]);
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("Array error: " + e.getMessage());
} catch (NumberFormatException e) {
    System.out.println("Number format error: " + e.getMessage());
} catch (Exception e) {  // Catch-all (must be last)
    System.out.println("Unknown error: " + e.getMessage());
}
```

### How ReBook Uses Try-Catch

In ReBook, **AuthService catches exceptions during login**:

```java
@Service
public class AuthService {
    public AuthResponse login(LoginRequest request) {
        try {
            // Try to find user
            User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "User not found with email: " + request.getEmail()));
            
            // Try to verify password
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Invalid password");
            }
            
            // If banned
            if (user.getIsBanned()) {
                throw new IllegalStateException("User account is banned");
            }
            
            // Generate tokens
            String accessToken = jwtUtil.generateAccessToken(user);
            return AuthResponse.builder()
                .accessToken(accessToken)
                .user(userMapper.toDTO(user))
                .build();
                
        } catch (ResourceNotFoundException e) {
            // User not found
            logger.warn("Login failed: User not found");
            throw e;
        } catch (IllegalArgumentException e) {
            // Invalid password
            logger.warn("Login failed: Invalid password");
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error during login", e);
            throw new RuntimeException("Login failed", e);
        }
    }
}
```

---

## 3. Finally Block

### What is Finally?
**Finally** is a block that executes **no matter what**—whether an exception occurs or not. Even if there's a `return` statement!

### Simple Example

```java
// Without Finally
int result;
try {
    result = 10 / 0;  // Exception occurs
    System.out.println("Result: " + result);  // SKIPPED
} catch (ArithmeticException e) {
    System.out.println("Error occurred");  // This runs
}
// Cleanup code here? But we forgot!


// With Finally
int result;
try {
    result = 10 / 0;  // Exception occurs
    System.out.println("Result: " + result);  // SKIPPED
} catch (ArithmeticException e) {
    System.out.println("Error occurred");  // This runs
} finally {
    System.out.println("Cleanup always runs!");  // ALWAYS RUNS
}
```

### Finally Always Runs - Even with Return

```java
public String testFinally() {
    try {
        System.out.println("In try block");
        return "From try";  // Tries to exit here
    } catch (Exception e) {
        System.out.println("In catch block");
        return "From catch";
    } finally {
        System.out.println("In finally block");  // STILL RUNS!
    }
}

testFinally();
// Output:
// In try block
// In finally block
// Returns: "From try"
```

### When to Use Finally

```java
// Example: Closing resources
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("file.txt"));
    String line = reader.readLine();
    System.out.println(line);
} catch (IOException e) {
    System.out.println("Error reading file: " + e.getMessage());
} finally {
    // Always close the file, even if exception occurs
    if (reader != null) {
        try {
            reader.close();
        } catch (IOException e) {
            System.out.println("Error closing file: " + e.getMessage());
        }
    }
}
```

### How ReBook Uses Finally

In ReBook, **repositories might use finally for cleanup**:

```java
public class DatabaseOperation {
    public List<User> getAllUsers() {
        Connection connection = null;
        try {
            connection = getConnection();  // Get database connection
            // ... query users
            return users;
        } catch (SQLException e) {
            logger.error("Database error", e);
            throw new RuntimeException(e);
        } finally {
            // Always close connection, even if exception occurs
            if (connection != null) {
                try {
                    connection.close();
                } catch (SQLException e) {
                    logger.error("Error closing connection", e);
                }
            }
        }
    }
}
```

---

## 4. Throw

### What is Throw?
**Throw** is used to **manually create** and **throw an exception**. You decide when to throw it.

### Simple Example

```java
public class BankAccount {
    private double balance = 1000;
    
    public void withdraw(double amount) {
        if (amount > balance) {
            throw new IllegalArgumentException(
                "Cannot withdraw $" + amount + ". Balance is only $" + balance);
        }
        balance = balance - amount;
        System.out.println("Withdrawn: $" + amount);
    }
}

// Usage
BankAccount acc = new BankAccount();
try {
    acc.withdraw(2000);  // Throws exception
} catch (IllegalArgumentException e) {
    System.out.println("Error: " + e.getMessage());
}
```

### Throwing Different Exceptions

```java
public class UserService {
    public void registerUser(String email, String password) {
        // Throw if email is invalid
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        
        // Throw if password is too weak
        if (password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        
        // Throw if user already exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("User already exists with this email");
        }
        
        // If all checks pass, create user
        User user = new User(email, password);
        userRepository.save(user);
    }
}

// Usage
try {
    userService.registerUser("invalid-email", "123");
} catch (IllegalArgumentException e) {
    System.out.println("Validation error: " + e.getMessage());
} catch (IllegalStateException e) {
    System.out.println("State error: " + e.getMessage());
}
```

### How ReBook Uses Throw

In ReBook, **RequestService throws exceptions for invalid operations**:

```java
@Service
public class RequestService {
    public BookRequest createRequest(CreateRequestDto dto) {
        // Throw if book not found
        Book book = bookService.getBook(dto.getBookId());
        if (book == null) {
            throw new ResourceNotFoundException(
                "Book not found with ID: " + dto.getBookId());
        }
        
        // Throw if book is not available
        if (!BookStatus.AVAILABLE.equals(book.getStatus())) {
            throw new IllegalStateException(
                "Book is not available. Current status: " + book.getStatus());
        }
        
        // Throw if user already has pending request for this book
        if (requestRepository.existsByBookIdAndSenderIdAndStatus(
            dto.getBookId(), getCurrentUserId(), RequestStatus.PENDING)) {
            throw new IllegalStateException(
                "You already have a pending request for this book");
        }
        
        // If all validations pass, create request
        BookRequest request = new BookRequest();
        request.setBook(book);
        request.setSenderId(getCurrentUserId());
        request.setStatus(RequestStatus.PENDING);
        return requestRepository.save(request);
    }
}
```

---

## 5. Throws

### What is Throws?
**Throws** is used in the **method signature** to declare that a method **might throw an exception**. It warns the caller: "Hey, this method can fail in this way!"

### Simple Example

```java
// WITHOUT throws - Error!
public void readFile(String filename) {
    // This throws IOException, but we didn't declare it
    FileReader reader = new FileReader(filename);  // COMPILE ERROR!
}

// WITH throws - Correct
public void readFile(String filename) throws IOException {
    // Now we've declared that this method can throw IOException
    FileReader reader = new FileReader(filename);  // OK!
    // Caller must handle it
}

// Usage
try {
    readFile("document.txt");
} catch (IOException e) {
    System.out.println("Error reading file: " + e.getMessage());
}
```

### Throwing Multiple Exceptions

```java
public void performOperation() throws IOException, SQLException, TimeoutException {
    // This method might throw any of these exceptions
    // Caller must handle them
}

// Usage
try {
    performOperation();
} catch (IOException e) {
    System.out.println("IO Error: " + e.getMessage());
} catch (SQLException e) {
    System.out.println("Database Error: " + e.getMessage());
} catch (TimeoutException e) {
    System.out.println("Timeout Error: " + e.getMessage());
}
```

### Throws vs Throw - Quick Comparison

```
THROW                               | THROWS
Creates and throws an exception     | Declares that method might throw
Used inside method body             | Used in method signature
throw new Exception();              | public void method() throws Exception
Immediate effect                    | Declares responsibility to caller
```

### How ReBook Uses Throws

In ReBook, **repository methods declare throws**:

```java
public interface BookRepository extends JpaRepository<Book, Long> {
    // These methods might throw IOException, SQLException, etc.
    List<Book> findByCategory(BookCategory category) throws SQLException;
    
    Book findById(Long id) throws DataAccessException;
}

// Service methods using these
@Service
public class BookService {
    public Book getBook(Long id) throws SQLException {
        // If repository throws, it propagates up
        return bookRepository.findById(id);
    }
    
    public void searchBooks(String keyword) throws DataAccessException {
        // If repository throws, caller must handle it
        List<Book> books = bookRepository.findByCategory(BookCategory.ENGINEERING);
    }
}
```

---

## 6. Checked vs Unchecked Exceptions

### What's the Difference?

```
CHECKED EXCEPTION               | UNCHECKED EXCEPTION
Compile-time check              | Runtime check
Must be caught or declared      | Optional to catch
Extends Exception class         | Extends RuntimeException
Examples: IOException, SQLException | NullPointerException, ArrayIndexOutOfBoundsException
```

### Checked Exceptions (Compile-Time)

```java
// These MUST be caught or declared with throws

// Compile Error - must handle!
public void readFile(String filename) {
    FileReader reader = new FileReader(filename);  // IOException is checked!
}

// Fix 1: Catch it
public void readFile(String filename) {
    try {
        FileReader reader = new FileReader(filename);
        // Read file
    } catch (IOException e) {
        System.out.println("Error: " + e.getMessage());
    }
}

// Fix 2: Declare throws
public void readFile(String filename) throws IOException {
    FileReader reader = new FileReader(filename);
}
```

### Unchecked Exceptions (Runtime)

```java
// These can be caught but don't HAVE to be (compiler doesn't force)

// This compiles fine - no error
public void process() {
    int[] arr = {1, 2, 3};
    System.out.println(arr[10]);  // ArrayIndexOutOfBoundsException (unchecked)
    // No try-catch, no throws - compiler doesn't complain
}

// But it's good practice to catch them anyway
public void process() {
    try {
        int[] arr = {1, 2, 3};
        System.out.println(arr[10]);
    } catch (ArrayIndexOutOfBoundsException e) {
        System.out.println("Error: " + e.getMessage());
    }
}
```

### Common Examples

```java
// CHECKED EXCEPTIONS - Compiler forces you to handle
IOException            // File operations
SQLException           // Database operations
TimeoutException       // Network operations
InterruptedException   // Thread operations

// UNCHECKED EXCEPTIONS - Compiler doesn't force handling
NullPointerException           // Accessing null object
ArrayIndexOutOfBoundsException // Invalid array index
ArithmeticException            // Division by zero
ClassCastException             // Invalid type cast
IllegalArgumentException       // Invalid method argument
```

### How ReBook Uses Checked vs Unchecked

```java
@Service
public class BookService {
    // Checked exception - must handle
    public void importBooksFromFile(String filename) throws IOException {
        // IOException is checked
        BufferedReader reader = new BufferedReader(new FileReader(filename));
        // ...
    }
    
    // Unchecked exception - optional to handle
    public Book getBookById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");  // Unchecked
        }
        return bookRepository.findById(id).orElse(null);
    }
    
    // Another unchecked
    public void processBooks(List<Book> books) {
        for (Book book : books) {
            System.out.println(book.getTitle());  // NullPointerException if book is null
        }
    }
}
```

---

## 7. Try-with-Resources (Java 7+)

### What is Try-with-Resources?
**Try-with-resources** automatically closes resources (like files, connections) without needing a finally block.

### Simple Example

```java
// OLD WAY (Java 6) - Need finally block
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("file.txt"));
    String line = reader.readLine();
    System.out.println(line);
} catch (IOException e) {
    System.out.println("Error: " + e.getMessage());
} finally {
    if (reader != null) {
        try {
            reader.close();
        } catch (IOException e) {
            // Handle error
        }
    }
}

// NEW WAY (Java 7+) - Automatic closing
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line = reader.readLine();
    System.out.println(line);
} catch (IOException e) {
    System.out.println("Error: " + e.getMessage());
}
// reader is automatically closed!
```

### Multiple Resources

```java
// Multiple resources - all auto-closed
try (
    BufferedReader reader = new BufferedReader(new FileReader("input.txt"));
    BufferedWriter writer = new BufferedWriter(new FileWriter("output.txt"))
) {
    String line;
    while ((line = reader.readLine()) != null) {
        writer.write(line);
        writer.newLine();
    }
} catch (IOException e) {
    System.out.println("Error: " + e.getMessage());
}
// Both reader and writer are automatically closed!
```

### Requirements for Try-with-Resources
The resource must implement `AutoCloseable` interface:

```java
public interface AutoCloseable {
    void close() throws Exception;
}

// Example: Custom resource
public class DatabaseConnection implements AutoCloseable {
    private Connection connection;
    
    @Override
    public void close() throws Exception {
        if (connection != null) {
            connection.close();
        }
    }
}

// Usage
try (DatabaseConnection dbConn = new DatabaseConnection()) {
    // Use database connection
} catch (Exception e) {
    // Handle error
}
// Connection automatically closed!
```

### How ReBook Might Use Try-with-Resources

```java
@Service
public class FileService {
    public List<String> readBooksFromCSV(String filename) throws IOException {
        List<String> books = new ArrayList<>();
        
        // Try-with-resources - automatically closes the reader
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line;
            while ((line = reader.readLine()) != null) {
                books.add(line);
            }
        }
        // reader is automatically closed here
        
        return books;
    }
    
    public void exportBooksToFile(List<Book> books, String filename) throws IOException {
        // Try-with-resources - automatically closes the writer
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            for (Book book : books) {
                writer.write(book.getTitle());
                writer.newLine();
            }
        }
        // writer is automatically closed here
    }
}
```

---

## 8. Multi-Catch Block (Java 7+)

### What is Multi-Catch?
Instead of multiple catch blocks, you can catch multiple exceptions in one block using the pipe `|` operator.

### Simple Example

```java
// OLD WAY (Multiple catch blocks)
try {
    int num = Integer.parseInt("ABC");
} catch (NumberFormatException e) {
    System.out.println("Number format error: " + e.getMessage());
} catch (NullPointerException e) {
    System.out.println("Null pointer error: " + e.getMessage());
} catch (Exception e) {
    System.out.println("Unknown error: " + e.getMessage());
}

// NEW WAY (Java 7+) - Multi-catch
try {
    int num = Integer.parseInt("ABC");
} catch (NumberFormatException | NullPointerException e) {
    System.out.println("Error: " + e.getMessage());
} catch (Exception e) {
    System.out.println("Unknown error: " + e.getMessage());
}
```

### More Examples

```java
// Catching multiple database exceptions
try {
    performDatabaseOperation();
} catch (SQLException | DataAccessException | TimeoutException e) {
    logger.error("Database operation failed: " + e.getMessage());
    // All three exceptions handled the same way
}

// Catching multiple IO exceptions
try {
    readAndWriteFiles();
} catch (IOException | FileNotFoundException e) {
    System.out.println("File operation failed: " + e.getMessage());
}
```

### How ReBook Uses Multi-Catch

```java
@Service
public class RequestService {
    public BookRequest createRequest(CreateRequestDto dto) {
        try {
            // Fetch book details
            Book book = bookService.getBook(dto.getBookId());
            
            // Fetch user details
            User user = userService.getUser(getCurrentUserId());
            
        } catch (ResourceNotFoundException | DataAccessException e) {
            // Handle both exceptions the same way
            logger.warn("Failed to fetch required data: " + e.getMessage());
            throw new RuntimeException("Failed to create request", e);
        }
        
        // Continue with request creation...
    }
}

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    // Multi-catch in exception handler
    @ExceptionHandler({ResourceNotFoundException.class, DataAccessException.class})
    public ResponseEntity<?> handleNotFoundOrDataError(Exception e) {
        return ResponseEntity.status(404).body("Error: " + e.getMessage());
    }
    
    // Another multi-catch
    @ExceptionHandler({IOException.class, FileNotFoundException.class})
    public ResponseEntity<?> handleFileErrors(Exception e) {
        return ResponseEntity.status(500).body("File error: " + e.getMessage());
    }
}
```

---

## 9. Custom Exceptions

### What are Custom Exceptions?
**Custom exceptions** are your own exception classes for specific error cases in your domain.

### Creating a Custom Exception

```java
// Step 1: Extend Exception or RuntimeException
public class InsufficientFundsException extends Exception {
    public InsufficientFundsException(String message) {
        super(message);
    }
}

// Step 2: Use it
public class BankAccount {
    private double balance;
    
    public void withdraw(double amount) throws InsufficientFundsException {
        if (amount > balance) {
            throw new InsufficientFundsException(
                "Cannot withdraw $" + amount + ". Available balance: $" + balance);
        }
        balance = balance - amount;
    }
}

// Step 3: Handle it
try {
    account.withdraw(5000);
} catch (InsufficientFundsException e) {
    System.out.println("Bank Error: " + e.getMessage());
}
```

### Custom Exception with Additional Info

```java
public class BookNotAvailableException extends RuntimeException {
    private Long bookId;
    private String bookTitle;
    private BookStatus currentStatus;
    
    public BookNotAvailableException(String message, Long bookId, 
                                     String bookTitle, BookStatus status) {
        super(message);
        this.bookId = bookId;
        this.bookTitle = bookTitle;
        this.currentStatus = status;
    }
    
    // Getters
    public Long getBookId() { return bookId; }
    public String getBookTitle() { return bookTitle; }
    public BookStatus getCurrentStatus() { return currentStatus; }
}

// Usage
try {
    if (!book.isAvailable()) {
        throw new BookNotAvailableException(
            "Book cannot be borrowed in current state",
            book.getId(),
            book.getTitle(),
            book.getStatus()
        );
    }
} catch (BookNotAvailableException e) {
    logger.error("Book " + e.getBookTitle() + " is " + e.getCurrentStatus());
}
```

### How ReBook Uses Custom Exceptions

In ReBook, **custom exceptions are defined for different error scenarios**:

```java
// auth-service/src/main/java/com/rebook/auth/exception/ResourceNotFoundException.java
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

// request-service/src/main/java/com/rebook/request/exception/InvalidRequestStatusException.java
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRequestStatusException extends RuntimeException {
    public InvalidRequestStatusException(String message) {
        super(message);
    }
}

// Usage in services
@Service
public class AuthService {
    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "User not found with ID: " + id));
    }
}

@Service
public class RequestService {
    public void approveRequest(Long requestId) {
        BookRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Request not found"));
        
        if (!RequestStatus.PENDING.equals(request.getStatus())) {
            throw new InvalidRequestStatusException(
                "Request must be in PENDING status to approve");
        }
        
        request.setStatus(RequestStatus.APPROVED);
        requestRepository.save(request);
    }
}
```

---

## 10. Exception Propagation

### What is Exception Propagation?
**Exception propagation** is when an exception travels up the call stack until it's caught.

### Simple Example

```java
// Layer 1: Bottom level (throws exception)
public class Database {
    public void query(String sql) throws SQLException {
        throw new SQLException("Connection timeout");  // Exception thrown here
    }
}

// Layer 2: Middle level (catches or propagates)
public class UserService {
    private Database db;
    
    public User getUserById(Long id) throws SQLException {
        // Exception propagates UP
        return db.query("SELECT * FROM users WHERE id = " + id);
    }
}

// Layer 3: Top level (final handler)
public class UserController {
    private UserService userService;
    
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        try {
            // Exception caught here
            return userService.getUserById(id);
        } catch (SQLException e) {
            System.out.println("Error getting user: " + e.getMessage());
            return null;
        }
    }
}

// Call flow:
// Controller calls UserService
// UserService calls Database
// Database throws SQLException
// SQLException propagates back to Controller
// Controller catches it
```

### Visual Representation

```
Call Stack:
┌─────────────────────┐
│ UserController      │  ← Exception caught HERE
│  getUser()          │
│     ↑ propagates    │
└──────────┬──────────┘
           │
┌──────────v──────────┐
│ UserService         │  ← Exception propagates
│  getUserById()      │
│     ↑ propagates    │
└──────────┬──────────┘
           │
┌──────────v──────────┐
│ Database            │  ← Exception thrown HERE
│  query()            │
│  throw SQLException │
└─────────────────────┘
```

### Selective Propagation

```java
@Service
public class BookService {
    
    public void publishBook(Long bookId) {
        try {
            // Try to upload to cloud
            cloudService.uploadBook(bookId);
        } catch (CloudException e) {
            // Log but don't propagate - optional step
            logger.warn("Cloud upload failed, but continuing: " + e.getMessage());
        }
        
        // But this error MUST propagate - required step
        try {
            notificationService.sendPublishNotification(bookId);
        } catch (NotificationException e) {
            // Propagate this - it's critical
            throw new RuntimeException("Failed to notify users", e);
        }
    }
}
```

### How ReBook Uses Exception Propagation

```java
// Controller level
@RestController
@RequestMapping("/api/requests")
public class RequestController {
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody CreateRequestDto dto) {
        // Service might throw ResourceNotFoundException or other exceptions
        // They propagate to GlobalExceptionHandler
        BookRequest request = requestService.createRequest(dto);
        return ResponseEntity.status(201).body(request);
    }
}

// Service level
@Service
public class RequestService {
    public BookRequest createRequest(CreateRequestDto dto) {
        // This throws ResourceNotFoundException
        // It propagates to Controller, then to GlobalExceptionHandler
        Book book = bookService.getBook(dto.getBookId());
        
        if (!BookStatus.AVAILABLE.equals(book.getStatus())) {
            throw new IllegalStateException("Book not available");
            // This also propagates up
        }
        
        return requestRepository.save(new BookRequest());
    }
}

// Global handler - catches propagated exceptions
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body("Not found: " + e.getMessage());
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(400).body("Invalid state: " + e.getMessage());
    }
}
```

---

## 11. Chained Exceptions

### What are Chained Exceptions?
**Chained exceptions** wrap one exception inside another to preserve the original cause. This helps with debugging.

### Simple Example

```java
// WITHOUT Chaining - lose original error
try {
    database.query("SELECT * FROM users");
} catch (SQLException e) {
    throw new RuntimeException("Database operation failed");
    // Original SQLException details are LOST!
}

// WITH Chaining - preserve original error
try {
    database.query("SELECT * FROM users");
} catch (SQLException e) {
    throw new RuntimeException("Database operation failed", e);
    // Original SQLException is preserved in "cause"
}
```

### Accessing Chained Exceptions

```java
try {
    try {
        int result = 10 / 0;  // ArithmeticException
    } catch (ArithmeticException e) {
        throw new RuntimeException("Calculation failed", e);
    }
} catch (RuntimeException e) {
    System.out.println("Main exception: " + e.getMessage());
    System.out.println("Cause: " + e.getCause());  // Get original exception
    System.out.println("Cause message: " + e.getCause().getMessage());
}

// Output:
// Main exception: Calculation failed
// Cause: / by zero
// Cause message: ArithmeticException
```

### Multiple Levels of Chaining

```java
// Chain 1: Database exception
SQLException sqlException = new SQLException("Connection refused");

// Chain 2: Wrap in service exception
DataAccessException dataException = 
    new DataAccessException("Cannot access database", sqlException);

// Chain 3: Wrap in business exception
BookServiceException bookException = 
    new BookServiceException("Failed to load books", dataException);

// Now all three exceptions are connected!
```

### How ReBook Uses Chained Exceptions

```java
@Service
public class BookService {
    public List<Book> searchBooks(String keyword) {
        try {
            return bookRepository.findByKeywordContaining(keyword);
        } catch (DataAccessException e) {
            // Chain the original database error
            logger.error("Failed to search books", e);
            throw new BookServiceException(
                "Failed to search books with keyword: " + keyword, e);
        }
    }
}

@Service
public class RequestService {
    public void createRequest(CreateRequestDto dto) {
        try {
            Book book = bookService.getBook(dto.getBookId());
            // ... more logic
        } catch (BookServiceException e) {
            // Chain the book service error
            logger.error("Failed to create request", e);
            throw new RequestServiceException(
                "Failed to create request", e);  // Original error preserved!
        }
    }
}

// In logs, you see the full chain:
// RequestServiceException: Failed to create request
// Caused by: BookServiceException: Failed to search books
// Caused by: DataAccessException: Connection refused
// Caused by: SQLException: Cannot connect to database
```

---

## 12. Spring Boot Exception Handling

### Spring Boot Built-in Features

Spring Boot automatically handles exceptions with:
- **Default error page** for unhandled exceptions
- **JSON error responses** with status code
- **Customizable error handling**

### Default Error Response

```
When an exception is thrown and not caught, Spring Boot returns:

{
  "timestamp": "2024-05-08T10:30:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Something went wrong",
  "path": "/api/users/1"
}
```

### @RestControllerAdvice - Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    // Handle ResourceNotFoundException
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException e) {
        ErrorResponse error = ErrorResponse.builder()
            .status("NOT_FOUND")
            .message(e.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    // Handle IllegalArgumentException
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException e) {
        ErrorResponse error = ErrorResponse.builder()
            .status("BAD_REQUEST")
            .message(e.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationErrors(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
    
    // Catch-all for any other exception
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(Exception e) {
        ErrorResponse error = ErrorResponse.builder()
            .status("INTERNAL_SERVER_ERROR")
            .message("An unexpected error occurred")
            .timestamp(LocalDateTime.now())
            .build();
        logger.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### Error Response DTO

```java
@Data
@Builder
public class ErrorResponse {
    private String status;
    private String message;
    private LocalDateTime timestamp;
    private String path;
    private Map<String, Object> details;
}

// Usage
ErrorResponse error = ErrorResponse.builder()
    .status("CONFLICT")
    .message("User already exists")
    .timestamp(LocalDateTime.now())
    .details(Map.of("email", "alice@example.com"))
    .build();
```

### How ReBook Uses Spring Boot Exception Handling

```java
// auth-service/src/main/java/com/rebook/auth/exception/GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of(
                "error", "NOT_FOUND",
                "message", e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of(
                "error", "INVALID_STATE",
                "message", e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
    }
}

// auth-service/src/main/java/com/rebook/auth/controller/AuthController.java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        // If request validation fails, exception is caught by GlobalExceptionHandler
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // If user not found, exception is caught by GlobalExceptionHandler
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
```

### @ExceptionHandler vs @RestControllerAdvice

```java
// OPTION 1: Exception handler in specific controller
@RestController
public class UserController {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body("Not found");
    }
    
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        // If exception occurs, local handler catches it
        return userService.getUserById(id);
    }
}

// OPTION 2: Global exception handler (preferred)
@RestControllerAdvice  // Handles ALL controllers
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body("Not found");
    }
}

// GlobalExceptionHandler catches exceptions from ALL controllers
```

### Ordered Exception Handling (Most Specific First)

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    // Most specific - caught first
    @ExceptionHandler(BookNotAvailableException.class)
    public ResponseEntity<?> handleBookNotAvailable(BookNotAvailableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
    
    // More general - caught if specific not matched
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
    
    // Most general - catch-all
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
    }
}
```

---

## 13. Very Important Interview Questions

### Q1: What is an Exception?

**Answer:**
> "An exception is an event that disrupts the normal flow of a program. Instead of crashing, Java allows you to catch and handle these errors gracefully using try-catch blocks. For example, dividing by zero throws ArithmeticException, accessing a null object throws NullPointerException. We can catch these and provide meaningful error messages to users."

---

### Q2: Difference between Throw and Throws

**Answer:**
```
THROW                               | THROWS
Used to throw an exception          | Used to declare exception in method
Inside method body                  | In method signature
throw new Exception()               | public void method() throws Exception
Immediate effect                    | Tells caller about potential exceptions
```

**Example:**
```java
// throw - actually creates exception
public void withdraw(double amount) {
    if (amount > balance) {
        throw new InsufficientFundsException("Not enough money");
    }
}

// throws - declares it might throw
public void readFile() throws IOException {
    // ...
}
```

---

### Q3: Finally Block Always Executes?

**Answer:**
> "Yes, finally block ALWAYS executes, even if there's a return statement in try or catch block. The only exceptions are: if JVM terminates (System.exit()), or if there's an infinite loop, or if the thread is killed. Finally is used for cleanup tasks like closing database connections or file streams."

---

### Q4: Checked vs Unchecked Exceptions

**Answer:**
```
CHECKED                             | UNCHECKED
Must be caught or declared          | Optional to catch
Compile-time check                  | Runtime check
Examples:                           | Examples:
- IOException                       | - NullPointerException
- SQLException                      | - ArrayIndexOutOfBoundsException
- FileNotFoundException             | - ArithmeticException
```

---

### Q5: Try-with-Resources vs Traditional Try-Catch-Finally

**Answer:**
> "Try-with-resources (Java 7+) automatically closes resources that implement AutoCloseable interface. Traditional try-catch-finally requires manual closing in finally block. Try-with-resources is cleaner and handles exceptions that might occur during resource closing. Example: `try (BufferedReader r = new BufferedReader(...)) { ... }` automatically closes the reader."

---

### Q6: What is Exception Chaining?

**Answer:**
> "Exception chaining means wrapping one exception inside another to preserve the original cause. This is done using the constructor: `throw new RuntimeException('Message', originalException)`. It helps with debugging because you can see the full stack trace of what caused the problem. In Spring Boot, we often chain database exceptions into service exceptions to provide meaningful context."

---

### Q7: How Does Spring Boot Handle Exceptions?

**Answer:**
> "Spring Boot provides @RestControllerAdvice to create a global exception handler. All unhandled exceptions from any controller are caught by methods annotated with @ExceptionHandler. The handler returns a ResponseEntity with appropriate HTTP status code and error message. This provides consistent error responses across the entire API."

---

### Q8: When to Use Custom Exceptions?

**Answer:**
> "Create custom exceptions for domain-specific errors in your application. For example, BookNotAvailableException, InsufficientFundsException, InvalidRequestStatusException. This makes code clearer and allows specific error handling. Extend RuntimeException for unchecked exceptions (no try-catch required), or Exception for checked exceptions (try-catch required)."

---

## 14. Practical Exercises

### Exercise 1: Bank ATM System

```java
// Custom exceptions
public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String message) {
        super(message);
    }
}

public class InvalidPINException extends Exception {
    public InvalidPINException(String message) {
        super(message);
    }
}

// ATM class with exception handling
public class ATM {
    private BankAccount account;
    private int attempts = 3;
    
    public void withdraw(double amount, int pin) {
        try {
            // Validate PIN
            if (!validatePIN(pin)) {
                attempts--;
                if (attempts == 0) {
                    throw new InvalidPINException("Card blocked after 3 wrong attempts");
                }
                throw new InvalidPINException("Wrong PIN. Attempts left: " + attempts);
            }
            
            // Check balance
            if (amount > account.getBalance()) {
                throw new InsufficientBalanceException(
                    "Insufficient balance. Available: $" + account.getBalance());
            }
            
            // Perform withdrawal
            account.withdraw(amount);
            System.out.println("Withdrawn: $" + amount);
            System.out.println("Remaining balance: $" + account.getBalance());
            
        } catch (InsufficientBalanceException e) {
            System.out.println("Withdrawal failed: " + e.getMessage());
        } catch (InvalidPINException e) {
            System.out.println("ATM Error: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("Unexpected error: " + e.getMessage());
        } finally {
            System.out.println("Thank you for using ATM");
        }
    }
    
    private boolean validatePIN(int pin) throws InvalidPINException {
        return pin == 1234;
    }
}

// Usage
ATM atm = new ATM();
atm.withdraw(100, 1234);      // Success
atm.withdraw(5000, 1234);     // InsufficientBalanceException
atm.withdraw(100, 0000);      // InvalidPINException
```

### Exercise 2: File Processing with Try-with-Resources

```java
public class FileProcessor {
    
    // Read file with try-with-resources
    public List<String> readLines(String filename) throws IOException {
        List<String> lines = new ArrayList<>();
        
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        } catch (FileNotFoundException e) {
            throw new FileNotFoundException("File not found: " + filename);
        } catch (IOException e) {
            throw new IOException("Error reading file: " + filename, e);
        }
        
        return lines;
    }
    
    // Write to file with try-with-resources
    public void writeLines(String filename, List<String> lines) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            for (String line : lines) {
                writer.write(line);
                writer.newLine();
            }
        } catch (IOException e) {
            throw new IOException("Error writing to file: " + filename, e);
        }
    }
    
    // Copy file
    public void copyFile(String source, String destination) throws IOException {
        try (
            BufferedReader reader = new BufferedReader(new FileReader(source));
            BufferedWriter writer = new BufferedWriter(new FileWriter(destination))
        ) {
            String line;
            while ((line = reader.readLine()) != null) {
                writer.write(line);
                writer.newLine();
            }
        } catch (IOException e) {
            throw new IOException("Error copying file", e);
        }
    }
}

// Usage
FileProcessor processor = new FileProcessor();
try {
    List<String> lines = processor.readLines("input.txt");
    processor.writeLines("output.txt", lines);
    processor.copyFile("input.txt", "backup.txt");
} catch (IOException e) {
    System.out.println("Error: " + e.getMessage());
    e.printStackTrace();
}
```

### Exercise 3: Spring Boot Exception Handling in ReBook Style

```java
// Custom exception
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BookNotAvailableException extends RuntimeException {
    private Long bookId;
    private BookStatus currentStatus;
    
    public BookNotAvailableException(Long bookId, BookStatus status) {
        super("Book " + bookId + " is not available. Status: " + status);
        this.bookId = bookId;
        this.currentStatus = status;
    }
}

// Service with exception handling
@Service
public class RequestService {
    
    public BookRequest createRequest(CreateRequestDto dto) {
        try {
            // Try to fetch book
            Book book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Book not found with ID: " + dto.getBookId()));
            
            // Check if book is available
            if (!BookStatus.AVAILABLE.equals(book.getStatus())) {
                throw new BookNotAvailableException(book.getId(), book.getStatus());
            }
            
            // Create request
            BookRequest request = new BookRequest();
            request.setBook(book);
            request.setStatus(RequestStatus.PENDING);
            return requestRepository.save(request);
            
        } catch (DataAccessException e) {
            throw new RuntimeException("Database error: " + e.getMessage(), e);
        }
    }
}

// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", e.getMessage()));
    }
    
    @ExceptionHandler(BookNotAvailableException.class)
    public ResponseEntity<?> handleBookNotAvailable(BookNotAvailableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", e.getMessage()));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception e) {
        logger.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "An unexpected error occurred"));
    }
}

// Controller
@RestController
@RequestMapping("/api/requests")
public class RequestController {
    
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody CreateRequestDto dto) {
        try {
            BookRequest request = requestService.createRequest(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(request);
        } catch (ResourceNotFoundException | BookNotAvailableException e) {
            throw e;  // Let GlobalExceptionHandler handle it
        }
    }
}
```

---

## Summary Table

| Topic | Key Point | Example |
|-------|-----------|---------|
| **Try-Catch** | Catch exceptions | `try { } catch (Exception e) { }` |
| **Finally** | Always executes | Resource cleanup |
| **Throw** | Create exception | `throw new Exception()` |
| **Throws** | Declare exception | `public void method() throws Exception` |
| **Checked** | Compile-time | IOException, SQLException |
| **Unchecked** | Runtime | NullPointerException |
| **Try-with-Resources** | Auto-close | `try (Resource r = new Resource())` |
| **Multi-Catch** | Catch multiple | `catch (IOException \| SQLException e)` |
| **Custom** | Domain-specific | `class MyException extends Exception` |
| **Propagation** | Up the call stack | Exception travels to caller |
| **Chaining** | Preserve cause | `throw new Exception("msg", cause)` |
| **Spring Boot** | Global handler | `@RestControllerAdvice` |

---

## How to Use This Guide

1. **Read simple concepts first** with beginner examples
2. **Understand the purpose** of each feature
3. **See ReBook usage** for production context
4. **Practice exercises** for hands-on experience
5. **Refer to interview questions** for preparation

**Good Luck! 🚀**

