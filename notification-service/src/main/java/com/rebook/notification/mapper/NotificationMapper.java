package com.rebook.notification.mapper;

import org.mapstruct.Mapper;

import com.rebook.notification.dto.NotificationResponse;
import com.rebook.notification.entity.Notification;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    NotificationResponse toResponse(Notification notification);
}
