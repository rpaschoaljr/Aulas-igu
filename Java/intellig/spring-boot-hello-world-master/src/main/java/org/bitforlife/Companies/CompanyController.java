package org.bitforlife.Companies;

import org.apache.coyote.BadRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping ("/company")
public class CompanyController  {
    private final CompanyService service;
    public CompanyController(CompanyService serviceInjetado){
        this.service = serviceInjetado;

    }
    @PostMapping
    public Company save(@RequestBody Company company){
        return this.service.save(company);
    }
    @GetMapping
    public List<Company> findAll(){
        return this.service.findAll();
    }
    @PutMapping("/{id}")
    public Company update(@PathVariable(name = "id") Integer id, @RequestBody Company company) throws BadRequestException {
        return this.service.update(id, company);
    }
    @DeleteMapping("/{id}")
    public ResponseEntity delete(@PathVariable(name = "id")Integer id) throws BadRequestException {
        boolean result = this.service.deleteById(id);
        if(result){
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.notFound().build();
    }


}
