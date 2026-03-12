package com.rebook.book.repository;

import com.rebook.book.entity.Book;
import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends JpaRepository<Book, Long>, JpaSpecificationExecutor<Book> {

    @EntityGraph(attributePaths = "images")
    java.util.Optional<Book> findWithImagesById(Long id);

    List<Book> findByOwnerIdAndStatus(Long ownerId, BookStatus status);

    @EntityGraph(attributePaths = "images")
    Page<Book> findByOwnerId(Long ownerId, Pageable pageable);

    @EntityGraph(attributePaths = "images")
    Page<Book> findByCategoryAndStatus(BookCategory category, BookStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "images")
    List<Book> findTop10ByStatusOrderByRequestCountDesc(BookStatus status);

    @EntityGraph(attributePaths = "images")
    @Query("SELECT b FROM Book b WHERE b.status = :status AND b.id <> :bookId " +
            "AND (b.category = :category OR lower(b.author) = lower(:author))")
    Page<Book> findRecommendations(@Param("bookId") Long bookId,
            @Param("category") BookCategory category,
            @Param("author") String author,
            @Param("status") BookStatus status,
            Pageable pageable);

    @Modifying
    @Query("UPDATE Book b SET b.status = :status WHERE b.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") BookStatus status);

    @Modifying
    @Query("UPDATE Book b SET b.requestCount = b.requestCount + 1 WHERE b.id = :id")
    int incrementRequestCount(@Param("id") Long id);

    @Query(value = "SELECT *, " +
            "(6371 * acos(cos(radians(:lat)) * cos(radians(b.latitude)) * " +
            "cos(radians(b.longitude) - radians(:lng)) + " +
            "sin(radians(:lat)) * sin(radians(b.latitude)))) AS distance " +
            "FROM books b " +
            "WHERE status = 'AVAILABLE' " +
            "HAVING distance < :radiusKm " +
            "ORDER BY distance", nativeQuery = true)
    List<Object[]> findAvailableBooksWithinRadius(@Param("lat") Double lat,
            @Param("lng") Double lng,
            @Param("radiusKm") Double radiusKm);
}
