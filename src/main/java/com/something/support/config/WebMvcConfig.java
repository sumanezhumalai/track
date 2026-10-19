package com.something.support.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /**
     * SPA fallback: any non-/api GET serves index.html so React Router
     * handles client-side navigation after a browser refresh.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected org.springframework.core.io.Resource getResource(
                            String resourcePath,
                            org.springframework.core.io.Resource location) throws java.io.IOException {
                        org.springframework.core.io.Resource requested = location.createRelative(resourcePath);
                        return (requested.exists() && requested.isReadable())
                                ? requested
                                : new org.springframework.core.io.ClassPathResource("/static/index.html");
                    }
                });
    }
}
