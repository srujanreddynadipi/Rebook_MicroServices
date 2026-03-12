package com.rebook.auth.repository;

import com.rebook.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

    Page<User> findByIsBannedFalse(Pageable pageable);

    @Modifying
    @Query("UPDATE User u SET u.averageRating = :rating, u.totalRatings = :total WHERE u.id = :userId")
    void updateRating(@Param("userId") Long userId,
            @Param("rating") Double rating,
            @Param("total") Integer total);
}
