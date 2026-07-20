package org.bitforlife.Todo;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("todos")
public class TodoController {


    private final TodoService service;

    public TodoController(TodoService service) {
        this.service = service;
    }

    //Criar uma tarefa
    @PostMapping
    public ResponseEntity<Todo> create(@RequestBody Todo todo) {
        return ResponseEntity.ok(this.service.create(todo));
    }


    //Listar a tarefa
    @GetMapping
    public ResponseEntity<List<Todo>> listAll() {
        return ResponseEntity.ok(this.service.listAll());
    }

    //Alterar a tarefa (marcar feita ou nao feita)
    @PutMapping("/{id}")
    public ResponseEntity<Todo> update(@PathVariable(name = "id") int id, @RequestBody Todo todo) throws Exception {
        Todo todoUpdated = this.service.update(id, todo);

        return ResponseEntity.ok(todoUpdated);

    }

    //Excluir tarefa
    @DeleteMapping("/{id}")
    public ResponseEntity deleteById(@PathVariable(name = "id") int id) {

        if (this.service.deleteById(id)) {
            return ResponseEntity.ok().build();
        }

        return ResponseEntity.notFound().build();


    }


}
