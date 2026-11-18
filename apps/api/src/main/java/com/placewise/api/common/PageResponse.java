package com.placewise.api.common;

import java.util.List;

/** One page of results, with the paging needed to show "page 2 of 5". */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}
