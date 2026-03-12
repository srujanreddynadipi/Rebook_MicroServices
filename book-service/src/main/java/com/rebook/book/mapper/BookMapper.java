package com.rebook.book.mapper;

import com.rebook.book.dto.request.UpdateBookRequest;
import com.rebook.book.dto.response.BookImageResponse;
import com.rebook.book.dto.response.BookResponse;
import com.rebook.book.entity.Book;
import com.rebook.book.entity.BookImage;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.mapstruct.AfterMapping;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface BookMapper {

    @Mapping(target = "isDonation", source = "donation")
    @Mapping(target = "isLending", source = "lending")
    @Mapping(target = "imageUrls", ignore = true)
    @Mapping(target = "coverImageUrl", ignore = true)
    @Mapping(target = "distanceKm", ignore = true)
    @Mapping(target = "ownerName", ignore = true)
    BookResponse toResponse(Book book);

    List<BookResponse> toResponseList(List<Book> books);

    @Mapping(target = "isCover", source = "cover")
    BookImageResponse toImageResponse(BookImage image);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    @Mapping(target = "requestCount", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "donation", source = "isDonation")
    @Mapping(target = "lending", source = "isLending")
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateBookFromRequest(UpdateBookRequest req, @MappingTarget Book book);

    @AfterMapping
    default void enrichImageFields(Book source, @MappingTarget BookResponse target) {
        if (source == null || source.getImages() == null) {
            target.setImageUrls(new ArrayList<>());
            return;
        }

        List<String> coverUrls = source.getImages().stream()
                .filter(BookImage::isCover)
                .map(BookImage::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .toList();

        List<String> otherUrls = source.getImages().stream()
                .filter(image -> !image.isCover())
                .map(BookImage::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .toList();

        List<String> orderedUrls = new ArrayList<>(coverUrls.size() + otherUrls.size());
        orderedUrls.addAll(coverUrls);
        orderedUrls.addAll(otherUrls);

        target.setImageUrls(orderedUrls);
        target.setCoverImageUrl(coverUrls.isEmpty() ? null : coverUrls.get(0));

        if (target.getImages() != null) {
            target.getImages().sort(Comparator.comparing(BookImageResponse::isCover).reversed());
        }
    }
}
