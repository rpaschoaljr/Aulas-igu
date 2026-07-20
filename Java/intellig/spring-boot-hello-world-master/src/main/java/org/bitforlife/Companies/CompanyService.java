package org.bitforlife.Companies;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service

public class CompanyService {

    private final CompanyRepository repository;
    public CompanyService(CompanyRepository repInjetado) {
        this.repository = repInjetado;
    }
    public List<Company> findAll(){
        return this.repository.findAll();
    }
    public Company save(Company company){

        return this.repository.save(company);
    }
    public Company update(int id, Company company){

        Optional<Company> existendcompany = this.repository.findById(id);

        if(existendcompany.isPresent()){
            Company _company = existendcompany.get();
           _company.setName(company.getName());
           return this.repository.save(_company);
        }

    return null;
    }
    public boolean deleteById (Integer id){
        if(this.repository.existsById(id)){
            this.repository.deleteById(id);
            return true;
        }
        return false;
    }
}
