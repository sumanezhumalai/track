package com.something.support.dto;

/**
 * Request body for adding a subtask or toggling its completed state.
 * text is required only on creation; completed is used only on toggle.
 */
public record SubtaskRequest(
        String text,
        Boolean completed
) {}
