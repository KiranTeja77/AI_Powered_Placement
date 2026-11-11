package com.placewise.api.role;

import com.placewise.api.role.CatalogueDtos.RoleResponse;
import com.placewise.api.role.CatalogueDtos.SkillResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The role catalogue (with the skills each role needs) and the full skill list. Any signed-in user. */
@RestController
@RequestMapping("/api/v1")
class CatalogueController {

    private final CatalogueService catalogue;

    CatalogueController(CatalogueService catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping("/roles")
    List<RoleResponse> roles() {
        return catalogue.get().roles();
    }

    @GetMapping("/skills")
    List<SkillResponse> skills() {
        return catalogue.get().skills();
    }
}
