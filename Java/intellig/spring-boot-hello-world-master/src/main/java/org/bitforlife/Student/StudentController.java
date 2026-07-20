package org.bitforlife.Student;


import org.apache.coyote.BadRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/students")
public class StudentController {

    private final StudentService service;

    public StudentController(StudentService serviceInjetada) {
        this.service = serviceInjetada;
    }

    //CRUD

    //C
    @PostMapping
    public Student save(@RequestBody Student student) {
        return this.service.save(student);
    }

    //R
    @GetMapping
    public List<Student> findAll() {
        return this.service.findAll();
    }

    //R2.0
    @GetMapping("/{id}")
    public ResponseEntity<Student> findById(@PathVariable(name = "id") Integer id) throws Exception {
        return ResponseEntity.ok(this.service.findById(id));

    }

    //U
    @PutMapping("/{id}")
    public Student update(@PathVariable(name = "id") Integer id, @RequestBody Student student) throws BadRequestException {
        return this.service.update(id, student);
    }

    //D
    @DeleteMapping("/{id}")
    public ResponseEntity delete(@PathVariable(name = "id") Integer id) {
        boolean result = this.service.deleteById(id);
        if (result) {
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.notFound().build();
    }

}
